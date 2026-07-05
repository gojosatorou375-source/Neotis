"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { stepForceLayout, seededPosition, type SimEdge, type SimNode } from "@/lib/graph/force-layout";

export interface InteractiveGraphNode {
  id: string;
  label: string;
  color: string;
  radius: number;
  /** Hub-style node (e.g. the topic a set of conversations orbit) — rendered
   * bigger with a bolder, larger label, matching Obsidian's local-graph look. */
  emphasis?: boolean;
}

export interface InteractiveGraphEdge {
  source: string;
  target: string;
  weight?: number;
}

interface LiveNode extends SimNode {
  label: string;
  color: string;
  emphasis?: boolean;
}

interface InteractiveGraphProps {
  nodes: InteractiveGraphNode[];
  edges: InteractiveGraphEdge[];
  activeId?: string | null;
  onNodeClick?: (id: string) => void;
  height?: number;
  emptyState?: React.ReactNode;
}

const WIDTH = 1000;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3.5;
const ZOOM_STEP = 0.25;
const DRAG_CLICK_THRESHOLD = 5;

export function InteractiveGraph({
  nodes,
  edges,
  activeId = null,
  onNodeClick,
  height = 560,
  emptyState,
}: InteractiveGraphProps) {
  const HEIGHT = height;
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Live, mutable physics state — kept out of React state so the sim can run
  // every animation frame without triggering full re-renders on its own; a
  // `tick` counter below drives the (cheap) re-render instead.
  const liveNodesRef = useRef<LiveNode[]>([]);
  const liveEdgesRef = useRef<SimEdge[]>([]);
  const pinnedRef = useRef<Set<string>>(new Set());
  const [, setTick] = useState(0);

  // Pan / zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panDragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // Node dragging
  const nodeDragRef = useRef<{ id: string; moved: boolean; startClientX: number; startClientY: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;

  // Rebuild the live node/edge list whenever the *shape* of the graph
  // changes (nodes/edges added or removed), preserving positions + pin
  // state for anything that already existed so the graph doesn't jump.
  const shapeKey = useMemo(
    () => nodes.map((n) => n.id).sort().join(",") + "|" + edges.map((e) => `${e.source}-${e.target}`).sort().join(","),
    [nodes, edges]
  );

  useEffect(() => {
    const existing = new Map(liveNodesRef.current.map((n) => [n.id, n]));
    liveNodesRef.current = nodes.map((n) => {
      const prev = existing.get(n.id);
      if (prev) return { ...prev, label: n.label, color: n.color, radius: n.radius, emphasis: n.emphasis };
      const pos = seededPosition(n.id, WIDTH, HEIGHT);
      return { id: n.id, label: n.label, color: n.color, radius: n.radius, emphasis: n.emphasis, x: pos.x, y: pos.y, vx: 0, vy: 0 };
    });
    liveEdgesRef.current = edges.map((e) => ({ source: e.source, target: e.target }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey, HEIGHT]);

  // Continuous physics loop — always running while mounted. Heavily damped,
  // so once the layout settles it barely perturbs; dragging a node (which
  // pins it and moves its neighbors via spring/repulsion forces) wakes it
  // back up naturally since the same loop is always ticking.
  useEffect(() => {
    let raf: number;
    let alive = true;
    function frame() {
      if (!alive) return;
      stepForceLayout(liveNodesRef.current, liveEdgesRef.current, {
        width: WIDTH,
        height: HEIGHT,
        pinned: pinnedRef.current,
      });
      setTick((t) => (t + 1) % 1_000_000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [HEIGHT]);

  const nodeById = new Map(liveNodesRef.current.map((n) => [n.id, n]));

  const connectedIds = useMemo(() => {
    const focus = hoveredId ?? activeId;
    if (!focus) return new Set<string>();
    const set = new Set<string>();
    for (const e of edges) {
      if (e.source === focus) set.add(e.target);
      if (e.target === focus) set.add(e.source);
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredId, activeId, edges]);

  const focusId = hoveredId ?? activeId;

  // --- Screen <-> graph-space coordinate conversion ----------------------
  const clientToGraph = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const px = ((clientX - rect.left) / rect.width) * WIDTH;
      const py = ((clientY - rect.top) / rect.height) * HEIGHT;
      return {
        x: (px - cx) / zoom - pan.x + cx,
        y: (py - cy) / zoom - pan.y + cy,
      };
    },
    [zoom, pan, cx, cy, HEIGHT]
  );

  // --- Zoom controls ------------------------------------------------------
  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z - ZOOM_STEP)), []);
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    setZoom((z) => clampZoom(z - e.deltaY * 0.0015));
  }, []);

  // --- Background pan ------------------------------------------------------
  const handleBackgroundPointerDown = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (nodeDragRef.current) return;
      panDragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      setIsPanning(true);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [pan]
  );

  const handleBackgroundPointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (nodeDragRef.current) {
        const drag = nodeDragRef.current;
        const dx = e.clientX - drag.startClientX;
        const dy = e.clientY - drag.startClientY;
        if (Math.abs(dx) + Math.abs(dy) > DRAG_CLICK_THRESHOLD) drag.moved = true;
        const p = clientToGraph(e.clientX, e.clientY);
        const node = nodeById.get(drag.id);
        if (node) {
          node.x = p.x;
          node.y = p.y;
        }
        return;
      }
      const drag = panDragRef.current;
      if (!drag) return;
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      setPan({ x: drag.panX + dx, y: drag.panY + dy });
    },
    [clientToGraph, nodeById, zoom]
  );

  const handleBackgroundPointerUp = useCallback(() => {
    panDragRef.current = null;
    setIsPanning(false);
    if (nodeDragRef.current) {
      const { id, moved } = nodeDragRef.current;
      pinnedRef.current.delete(id);
      nodeDragRef.current = null;
      if (!moved) onNodeClick?.(id);
    }
  }, [onNodeClick]);

  // --- Node drag / click ---------------------------------------------------
  const handleNodePointerDown = useCallback((id: string) => (e: PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    nodeDragRef.current = { id, moved: false, startClientX: e.clientX, startClientY: e.clientY };
    pinnedRef.current.add(id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const contentTransform = `translate(${pan.x * zoom}, ${pan.y * zoom}) translate(${cx}, ${cy}) scale(${zoom}) translate(${-cx}, ${-cy})`;

  if (nodes.length === 0) {
    return (
      <>{emptyState}</>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ height: HEIGHT }}>
      <div className="absolute right-4 top-4 z-10 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
        <button onClick={zoomIn} className="flex h-8 w-8 items-center justify-center text-white/80 transition hover:bg-white/10 hover:text-white" aria-label="Zoom in">
          <Plus className="h-3.5 w-3.5" />
        </button>
        <div className="h-px w-full bg-white/10" />
        <button onClick={zoomOut} className="flex h-8 w-8 items-center justify-center text-white/80 transition hover:bg-white/10 hover:text-white" aria-label="Zoom out">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <div className="h-px w-full bg-white/10" />
        <button onClick={resetView} className="flex h-8 w-8 items-center justify-center text-white/80 transition hover:bg-white/10 hover:text-white" aria-label="Reset view">
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>
      <div className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10.5px] font-medium tabular-nums text-white/60 backdrop-blur-md">
        {Math.round(zoom * 100)}%
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-full w-full"
        style={{
          background: "#191c2c",
          cursor: isPanning ? "grabbing" : "grab",
          touchAction: "none",
        }}
        onWheel={handleWheel}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handleBackgroundPointerMove}
        onPointerUp={handleBackgroundPointerUp}
        onPointerLeave={handleBackgroundPointerUp}
      >
        <g transform={contentTransform}>
          {liveEdgesRef.current.map((edge) => {
            const a = nodeById.get(edge.source);
            const b = nodeById.get(edge.target);
            if (!a || !b) return null;
            const dim = focusId && edge.source !== focusId && edge.target !== focusId;
            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="rgba(150,152,182,0.28)"
                strokeOpacity={dim ? 0.12 : 1}
                strokeWidth={1}
              />
            );
          })}

          {liveNodesRef.current.map((node) => {
            const isFocus = node.id === focusId;
            const isConnected = connectedIds.has(node.id);
            const dim = focusId && !isFocus && !isConnected;
            const labelSize = node.emphasis ? 13 : 10;
            const labelWeight = node.emphasis ? 600 : 500;
            const labelColor = node.emphasis ? "#e4e5f1" : "#9497b8";
            const labelOffset = node.radius + (node.emphasis ? 20 : 13);
            return (
              <g
                key={node.id}
                className="cursor-pointer"
                opacity={dim ? 0.28 : 1}
                onPointerDown={handleNodePointerDown(node.id)}
                onPointerEnter={() => setHoveredId(node.id)}
                onPointerLeave={() => setHoveredId((h) => (h === node.id ? null : h))}
              >
                {isFocus && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius + 5}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                )}
                <circle cx={node.x} cy={node.y} r={node.radius} fill={node.color} />
                <text
                  x={node.x}
                  y={node.y + labelOffset}
                  textAnchor="middle"
                  fontSize={labelSize}
                  fontWeight={labelWeight}
                  fill={labelColor}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
