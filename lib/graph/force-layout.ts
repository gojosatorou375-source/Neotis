// A small, dependency-free force-directed layout (repulsion + spring edges +
// mild centering), similar in spirit to what note-graph tools like Obsidian
// use: nodes scatter organically, well-connected nodes act as natural hubs,
// and loosely connected nodes drift out to the edges. Deliberately simple
// (O(n^2) repulsion) since this app's graphs are small (tens of nodes).

export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface SimEdge {
  source: string;
  target: string;
}

export interface LayoutOptions {
  width: number;
  height: number;
  iterations?: number;
  repulsion?: number;
  springLength?: number;
  springStrength?: number;
  centerStrength?: number;
  damping?: number;
}

export interface StepOptions {
  width: number;
  height: number;
  repulsion?: number;
  springLength?: number;
  springStrength?: number;
  centerStrength?: number;
  damping?: number;
  /** Node ids currently pinned (e.g. being dragged, or dropped-in-place)  —
   * forces still act on them for bookkeeping but their position is never
   * integrated, so they stay exactly where they were placed. */
  pinned?: Set<string>;
}

/** Runs exactly one physics tick in place, mutating node.x/y/vx/vy. Meant to
 * be called repeatedly from a requestAnimationFrame loop for a live,
 * continuously-interactive graph (drag a node, watch neighbors react) —
 * as opposed to `runForceLayout`, which settles a static layout up front. */
export function stepForceLayout(
  nodes: SimNode[],
  edges: SimEdge[],
  {
    width,
    height,
    repulsion = 2600,
    springLength = 95,
    springStrength = 0.02,
    centerStrength = 0.008,
    damping = 0.82,
    pinned,
  }: StepOptions
): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const margin = 40;

  // Repulsion between every pair of nodes (keeps them from overlapping).
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let distSq = dx * dx + dy * dy;
      if (distSq < 1) distSq = 1;
      const dist = Math.sqrt(distSq);
      const force = repulsion / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  // Spring attraction along edges (pulls connected nodes toward a resting distance).
  for (const edge of edges) {
    const a = byId.get(edge.source);
    const b = byId.get(edge.target);
    if (!a || !b) continue;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (dist - springLength) * springStrength;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  // Mild pull toward center so the whole graph doesn't drift off-canvas.
  for (const n of nodes) {
    n.vx += (width / 2 - n.x) * centerStrength;
    n.vy += (height / 2 - n.y) * centerStrength;
  }

  // Integrate velocity, damp it, clamp inside the canvas — except for
  // pinned nodes, which stay exactly where they were placed.
  for (const n of nodes) {
    if (pinned?.has(n.id)) {
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    n.vx *= damping;
    n.vy *= damping;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.max(margin, Math.min(width - margin, n.x));
    n.y = Math.max(margin, Math.min(height - margin, n.y));
  }
}

export function runForceLayout(
  nodes: SimNode[],
  edges: SimEdge[],
  { width, height, iterations = 260, ...rest }: LayoutOptions
): SimNode[] {
  for (let iter = 0; iter < iterations; iter++) {
    stepForceLayout(nodes, edges, { width, height, ...rest });
  }
  return nodes;
}

/** Deterministic pseudo-random start positions so the same graph always
 * settles into roughly the same layout instead of jumping around on refresh. */
export function seededPosition(seed: string, width: number, height: number): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const rand1 = Math.abs(Math.sin(hash)) % 1;
  const rand2 = Math.abs(Math.cos(hash * 1.37)) % 1;
  return {
    x: width * 0.15 + rand1 * width * 0.7,
    y: height * 0.15 + rand2 * height * 0.7,
  };
}
