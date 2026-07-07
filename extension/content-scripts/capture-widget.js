// Shared "glass sheet over the website" capture widget.
//
// Every provider's content script (chatgpt.js, claude.js, gemini.js, ...)
// mounts this once via window.NoetisCapture.mount({...}). It renders ONE
// circular icon button that opens a small menu:
//
//   - Project.md / Skills.md / Library.md -- each fetches that document
//     fresh from the server and pastes it straight into this page's
//     composer, so the same three documents work identically on every
//     supported LLM provider.
//   - Save this conversation -- stores the current conversation in Noetis.
//   - Share this conversation -- sends it to the server's AI handoff
//     endpoint, which distills it into a Markdown brief, then copies it to
//     the clipboard and downloads it as a .md file.
//
// The three docs are reference material (read-only, paste-only); Save and
// Share are the two actions that actually do something with the current
// conversation, which is why they're grouped below a divider, in that order.
//
// Placement, tried in order:
//   1. Dock mode -- finds an existing composer icon (mic button, voice-mode
//      button, etc. via `dockAnchorSelectors`) and inserts the button as a
//      real sibling right next to it, so it sits inline in the composer's
//      own icon row exactly like a native control would.
//   2. Floating fallback -- if no dock anchor is found (composer not loaded
//      yet, or this provider's markup doesn't match), it floats near
//      `anchorSelectors` (typically the Send button), or a fixed
//      bottom-right corner if even that isn't found.
//
// Renders inside a Shadow DOM so the host page's CSS can never bleed into
// the button/menu (and vice versa).
(function () {
  if (window.__noetisCaptureWidgetLoaded) return; // avoid double-mount on SPA re-injects
  window.__noetisCaptureWidgetLoaded = true;

  const HOST_ID = "noetis-capture-widget-host";
  const CHECK_INTERVAL_MS = 500;
  const RELOAD_MESSAGE = "Extension was reloaded — refresh this page to keep using Noetis.";

  // Menu items shown in the dropdown, in display order. "doc" items fetch a
  // Markdown document from the server and paste it into the composer.
  // "save" and "share" are the two actions that operate on the current
  // conversation instead -- kept last, below a divider, so the menu reads
  // top to bottom as: reference docs, then actions.
  const MENU_ITEMS = [
    { type: "doc", key: "personal", label: "Personal.md", hint: "Your AI communication profile" },
    { type: "doc", key: "project", label: "Project.md", hint: "Your active project profile" },
    { type: "doc", key: "skills", label: "Skills.md", hint: "All saved project skills" },
    { type: "doc", key: "library", label: "Library.md", hint: "Extracted knowledge index" },
    { type: "save", label: "Save this conversation", hint: "Store it in Noetis", divider: true },
    { type: "share", label: "Share this conversation", hint: "AI handoff (.md) for the next LLM" },
  ];

  const STYLE = `
    :host { all: initial; }
    .group {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .group.floating {
      position: fixed;
      z-index: 2147483647;
    }
    .btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      color: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.35);
      background: rgba(255,255,255,0.55);
      backdrop-filter: blur(14px) saturate(180%);
      -webkit-backdrop-filter: blur(14px) saturate(180%);
      box-shadow: 0 1px 4px rgba(0,0,0,0.12);
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease, opacity 0.15s ease;
    }
    .group.floating .btn { box-shadow: 0 4px 20px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.6); }
    .btn:hover { filter: brightness(0.97); cursor: grab; }
    .btn:active { transform: scale(0.94); }
    .btn.dragging { cursor: grabbing !important; opacity: 0.82; transform: scale(1.08); box-shadow: 0 8px 28px rgba(0,0,0,0.22); transition: none; }
    .btn.saving { background: rgba(10,132,255,0.85); color: #fff; border-color: rgba(10,132,255,0.4); }
    .btn.success { background: rgba(52,199,89,0.9); color: #fff; border-color: rgba(52,199,89,0.5); }
    .btn.error { background: rgba(255,59,48,0.9); color: #fff; border-color: rgba(255,59,48,0.5); }
    .icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; }
    .icon svg { width: 100%; height: 100%; }

    /* Provider specific sizing overrides to match native composer buttons */
    :host([provider="claude"]) .btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      margin: 0 4px;
    }
    :host([provider="chatgpt"]) .btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      margin: 0 4px;
    }
    :host([provider="gemini"]) .btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      margin: 0 4px;
    }
    :host([provider="grok"]) .btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      margin: 0 4px;
    }
    :host([provider="deepseek"]) .btn {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      margin: 0 4px;
    }
    :host([provider="perplexity"]) .btn {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      margin: 0 4px;
    }

    @media (prefers-color-scheme: dark) {
      .btn { background: rgba(30,30,32,0.6); color: #f2f2f2; border-color: rgba(255,255,255,0.14); }
    }
  `;

  // The menu used to live inside the same host as the button, positioned
  // with `position: absolute` relative to `.group`. That broke on real
  // composer bars: most of them set `overflow: hidden` on their icon row (to
  // keep everything inside a rounded pill), which silently clips anything
  // that pops up out of that row -- the menu was technically opening
  // (`.open` class toggling fine), it just had nowhere visible to render.
  // Rendering it in its own top-level host, appended straight to
  // `document.documentElement` and positioned with `position: fixed` from
  // the button's live bounding rect, means it's never inside any provider's
  // clipped/overflow-hidden container, regardless of how their composer is
  // built.
  const MENU_STYLE = `
    :host { all: initial; }
    .menu {
      position: fixed;
      min-width: 230px;
      padding: 6px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.35);
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      box-shadow: 0 12px 36px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.6);
      display: none;
      flex-direction: column;
      gap: 2px;
      z-index: 2147483647;
    }
    .menu.open { display: flex; }
    .menu-divider {
      height: 1px;
      margin: 4px 6px;
      background: rgba(0,0,0,0.08);
      border: none;
    }
    .menu-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1px;
      width: 100%;
      padding: 8px 10px;
      border: none;
      border-radius: 10px;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font: 600 12.5px/1.3 -apple-system, "SF Pro Display", Inter, system-ui, sans-serif;
      color: #1a1a1a;
    }
    .menu-item:hover { background: rgba(0,0,0,0.05); }
    .menu-item .hint { font-weight: 400; font-size: 11px; color: rgba(26,26,26,0.6); }
    .menu-item.loading .hint, .menu-item.loading .label { opacity: 0.5; }
    .menu-item.error .hint { color: #d92d20; }
    .menu-item.success .hint { color: #12805c; }

    @media (prefers-color-scheme: dark) {
      .menu { background: rgba(28,28,30,0.9); border-color: rgba(255,255,255,0.14); }
      .menu-divider { background: rgba(255,255,255,0.1); }
      .menu-item { color: #f2f2f2; }
      .menu-item:hover { background: rgba(255,255,255,0.08); }
      .menu-item .hint { color: rgba(242,242,242,0.6); }
    }
  `;

  const MODAL_STYLE = `
    :host { all: initial; }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      opacity: 0;
      transition: opacity 0.2s ease-out;
    }
    .backdrop.visible {
      opacity: 1;
    }
    .modal {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(25px) saturate(190%);
      -webkit-backdrop-filter: blur(25px) saturate(190%);
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: 20px;
      width: 90%;
      max-width: 700px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.6);
      transform: scale(0.95);
      transition: transform 0.2s ease-out;
    }
    .backdrop.visible .modal {
      transform: scale(1);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    .modal-title {
      margin: 0;
      font: 600 18px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
    }
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #1a1a1a;
      opacity: 0.5;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: opacity 0.2s, background-color 0.2s;
    }
    .close-btn:hover {
      opacity: 0.9;
      background-color: rgba(0, 0, 0, 0.05);
    }
    .modal-body {
      overflow-y: auto;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14.5px;
      line-height: 1.6;
      color: #333333;
    }
    .modal-body h1, .modal-body h2, .modal-body h3 {
      font-weight: 600;
      color: #111111;
      margin-top: 20px;
      margin-bottom: 8px;
    }
    .modal-body h1 { font-size: 1.4em; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 6px; }
    .modal-body h2 { font-size: 1.25em; }
    .modal-body h3 { font-size: 1.1em; }
    .modal-body p { margin-top: 0; margin-bottom: 12px; }
    .modal-body code {
      font-family: ui-monospace, SFMono-Regular, SF Pro Text, Menlo, Monaco, Consolas, monospace;
      font-size: 0.95em;
      background: rgba(0, 0, 0, 0.06);
      padding: 2px 5px;
      border-radius: 4px;
    }
    .modal-body pre {
      background: rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      padding: 12px;
      overflow-x: auto;
      margin: 12px 0;
    }
    .modal-body pre code {
      background: none;
      padding: 0;
      border-radius: 0;
    }
    .modal-body ul, .modal-body ol {
      margin-top: 0;
      margin-bottom: 12px;
      padding-left: 20px;
    }
    .modal-body li {
      margin-bottom: 4px;
    }
    .modal-body blockquote {
      border-left: 4px solid rgba(0, 0, 0, 0.15);
      margin: 12px 0;
      padding-left: 12px;
      color: #666666;
      font-style: italic;
    }
    .modal-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }
    .modal-btn {
      font: 600 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 8px 16px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
      border: none;
    }
    .modal-btn-primary {
      background: #007aff;
      color: white;
    }
    .modal-btn-primary:hover {
      background: #0062cc;
    }
    .modal-btn-secondary {
      background: rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #1a1a1a;
    }
    .modal-btn-secondary:hover {
      background: rgba(0, 0, 0, 0.08);
    }

    @media (prefers-color-scheme: dark) {
      .modal {
        background: rgba(28, 28, 30, 0.9);
        border-color: rgba(255, 255, 255, 0.14);
        box-shadow: 0 24px 60px rgba(0,0,0,0.45);
      }
      .modal-header, .modal-footer {
        border-color: rgba(255, 255, 255, 0.1);
      }
      .modal-title, .close-btn {
        color: #f2f2f2;
      }
      .close-btn:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }
      .modal-body {
        color: #e5e5e7;
      }
      .modal-body h1, .modal-body h2, .modal-body h3 {
        color: #ffffff;
      }
      .modal-body h1 {
        border-bottom-color: rgba(255, 255, 255, 0.1);
      }
      .modal-body code {
        background: rgba(255, 255, 255, 0.1);
      }
      .modal-body pre {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.08);
      }
      .modal-body blockquote {
        border-left-color: rgba(255, 255, 255, 0.2);
        color: #a1a1a5;
      }
      .modal-btn-secondary {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.1);
        color: #f2f2f2;
      }
      .modal-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.12);
      }
    }

    .picker-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
    }
    .picker-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.03);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
    }
    .picker-row:hover {
      background: rgba(0, 0, 0, 0.06);
      border-color: rgba(0, 0, 0, 0.12);
    }
    @media (prefers-color-scheme: dark) {
      .picker-row {
        background: rgba(255, 255, 255, 0.03);
        border-color: rgba(255, 255, 255, 0.08);
      }
      .picker-row:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.15);
      }
    }
    .picker-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-start;
    }
    .picker-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .picker-name {
      font-weight: 600;
      font-size: 14.5px;
      color: #1a1a1a;
      margin: 0;
    }
    @media (prefers-color-scheme: dark) {
      .picker-name {
        color: #f2f2f2;
      }
    }
    .picker-details {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #666;
    }
    @media (prefers-color-scheme: dark) {
      .picker-details {
        color: #a1a1a5;
      }
    }
    .picker-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1;
    }
    .picker-badge-personal {
      background: rgba(0, 122, 255, 0.1);
      color: #007aff;
    }
    .picker-badge-project {
      background: rgba(249, 115, 22, 0.1);
      color: #f97316;
    }
    .picker-badge-combined {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }
    .picker-action {
      font-size: 13.5px;
      color: #007aff;
      font-weight: 600;
    }
    .empty-state {
      text-align: center;
      padding: 32px 16px;
    }
    .empty-state-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 6px;
      color: #1a1a1a;
    }
    @media (prefers-color-scheme: dark) {
      .empty-state-title {
        color: #f2f2f2;
      }
    }
    .empty-state-text {
      font-size: 13.5px;
      color: #666;
      margin-bottom: 16px;
    }
    @media (prefers-color-scheme: dark) {
      .empty-state-text {
        color: #a1a1a5;
      }
    }
    .empty-state-btn {
      display: inline-block;
      background: #007aff;
      color: white !important;
      text-decoration: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      border: none;
      cursor: pointer;
    }
    .empty-state-btn:hover {
      background: #0062cc;
    }
    .back-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #007aff;
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .back-btn:hover {
      background: rgba(0, 122, 255, 0.08);
    }
  `;

  // NOTE ON TRUSTED TYPES: these used to be raw SVG markup strings assigned
  // via element.innerHTML. That silently broke the button on every provider
  // that sends a `require-trusted-types-for 'script'` CSP header (Gemini,
  // ChatGPT, and others do; claude.ai doesn't, which is why the button only
  // ever worked there) -- Trusted Types blocks innerHTML assignment at the
  // DOM level for ANY script touching the page, including an extension's
  // isolated-world content script, and throws instead of writing anything.
  // That thrown error happened inside makeButton(), before the button was
  // appended to the group, so the whole widget silently rendered as an
  // empty, invisible host on those sites. Building the icon as real SVG/DOM
  // nodes (see buildIcon below) never touches the innerHTML sink, so it
  // works identically everywhere regardless of a page's Trusted Types policy.
  const SVG_NS = "http://www.w3.org/2000/svg";

  const ICON_PATHS = {
    insert: [
      {
        d: "M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.7",
        "stroke-linejoin": "round",
      },
      { d: "M9 12h6M9 16h6M9 8h3", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round" },
    ],
    saving: [
      {
        d: "M12 3a9 9 0 1 0 9 9",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2.2",
        "stroke-linecap": "round",
        animate: true,
      },
    ],
    success: [
      {
        d: "M5 12.5l4.5 4.5L19 7",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2.4",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      },
    ],
    error: [
      { d: "M6 6l12 12M18 6L6 18", fill: "none", stroke: "currentColor", "stroke-width": "2.2", "stroke-linecap": "round" },
    ],
  };

  /** Builds one of the four status icons as real SVG DOM nodes -- see the
   * Trusted Types note above for why this isn't just an innerHTML string. */
  function buildIcon(key) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    for (const spec of ICON_PATHS[key] || []) {
      const path = document.createElementNS(SVG_NS, "path");
      for (const [attr, value] of Object.entries(spec)) {
        if (attr === "animate") continue;
        path.setAttribute(attr, value);
      }
      if (spec.animate) {
        const anim = document.createElementNS(SVG_NS, "animateTransform");
        anim.setAttribute("attributeName", "transform");
        anim.setAttribute("type", "rotate");
        anim.setAttribute("from", "0 12 12");
        anim.setAttribute("to", "360 12 12");
        anim.setAttribute("dur", "0.8s");
        anim.setAttribute("repeatCount", "indefinite");
        path.appendChild(anim);
      }
      svg.appendChild(path);
    }
    return svg;
  }

  function renderMarkdownToHtml(markdown) {
    if (!markdown) return "";
    let html = markdown
      // Escape HTML characters
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Headers
    html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
    html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");

    // Blockquotes
    html = html.replace(/^&gt;\s+(.+)$/gm, "<blockquote>$1</blockquote>");

    // Bullet lists (simple line by line mapping)
    const lines = html.split("\n");
    let inList = false;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.startsWith("- ") || line.startsWith("* ")) {
        let content = line.substring(2).trim();
        if (!inList) {
          lines[i] = "<ul><li>" + content + "</li>";
          inList = true;
        } else {
          lines[i] = "<li>" + content + "</li>";
        }
      } else {
        if (inList) {
          lines[i] = "</ul>" + (line ? "<p>" + line + "</p>" : "");
          inList = false;
        } else {
          if (line && !line.startsWith("<h") && !line.startsWith("</h") && !line.startsWith("<pre") && !line.startsWith("</pre") && !line.startsWith("<blockquote") && !line.startsWith("</blockquote")) {
            lines[i] = "<p>" + line + "</p>";
          }
        }
      }
    }
    if (inList) {
      lines.push("</ul>");
    }
    html = lines.join("\n");

    // Strong/Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    return html;
  }

  function showMarkdownModal(title, markdown, composerSelectors) {
    const existing = document.getElementById(HOST_ID + "-modal");
    if (existing) existing.remove();

    const host = document.createElement("div");
    host.id = HOST_ID + "-modal";
    const shadow = host.attachShadow({ mode: "open" });

    const styleEl = document.createElement("style");
    styleEl.textContent = MODAL_STYLE;
    shadow.appendChild(styleEl);

    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    shadow.appendChild(backdrop);

    const modal = document.createElement("div");
    modal.className = "modal";
    backdrop.appendChild(modal);

    // Header
    const header = document.createElement("div");
    header.className = "modal-header";
    modal.appendChild(header);

    const titleEl = document.createElement("h2");
    titleEl.className = "modal-title";
    titleEl.textContent = title;
    header.appendChild(titleEl);

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.title = "Close";
    closeBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    header.appendChild(closeBtn);

    // Body
    const body = document.createElement("div");
    body.className = "modal-body";
    body.innerHTML = renderMarkdownToHtml(markdown);
    modal.appendChild(body);

    // Footer
    const footer = document.createElement("div");
    footer.className = "modal-footer";
    modal.appendChild(footer);

    // Close Button
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-btn modal-btn-secondary";
    cancelBtn.textContent = "Close";
    footer.appendChild(cancelBtn);

    // Copy Button
    const copyBtn = document.createElement("button");
    copyBtn.className = "modal-btn modal-btn-secondary";
    copyBtn.textContent = "Copy to Clipboard";
    footer.appendChild(copyBtn);

    // Insert Button
    let insertBtn = null;
    const composerEl = findVisible(composerSelectors);
    if (composerEl) {
      insertBtn = document.createElement("button");
      insertBtn.className = "modal-btn modal-btn-primary";
      insertBtn.textContent = "Insert into Composer";
      footer.appendChild(insertBtn);
    }

    document.documentElement.appendChild(host);

    // Trigger animation
    backdrop.getBoundingClientRect();
    backdrop.classList.add("visible");

    function dismiss() {
      backdrop.classList.remove("visible");
      setTimeout(() => host.remove(), 200);
    }

    closeBtn.addEventListener("click", dismiss);
    cancelBtn.addEventListener("click", dismiss);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) dismiss();
    });

    copyBtn.addEventListener("click", async () => {
      const ok = await copyToClipboard(markdown);
      if (ok) {
        copyBtn.textContent = "Copied ✓";
        copyBtn.style.borderColor = "rgba(52,199,89,0.5)";
        copyBtn.style.color = "#12805c";
        setTimeout(() => {
          copyBtn.textContent = "Copy to Clipboard";
          copyBtn.style.borderColor = "";
          copyBtn.style.color = "";
        }, 2000);
      } else {
        copyBtn.textContent = "Failed ✗";
        setTimeout(() => {
          copyBtn.textContent = "Copy to Clipboard";
        }, 2000);
      }
    });

    if (insertBtn) {
      insertBtn.addEventListener("click", () => {
        try {
          setComposerText(composerEl, markdown);
          insertBtn.textContent = "Inserted ✓";
          insertBtn.style.backgroundColor = "#34c759";
          setTimeout(() => {
            dismiss();
          }, 800);
        } catch {
          insertBtn.textContent = "Failed ✗";
          insertBtn.style.backgroundColor = "#ff3b30";
          setTimeout(() => {
            insertBtn.textContent = "Insert into Composer";
            insertBtn.style.backgroundColor = "";
          }, 2000);
        }
      });
    }
  }

  function showPickerOrContentModal(menuLabel, docType, list, composerSelectors) {
    const existing = document.getElementById(HOST_ID + "-modal");
    if (existing) existing.remove();

    const host = document.createElement("div");
    host.id = HOST_ID + "-modal";
    const shadow = host.attachShadow({ mode: "open" });

    const styleEl = document.createElement("style");
    styleEl.textContent = MODAL_STYLE;
    shadow.appendChild(styleEl);

    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    shadow.appendChild(backdrop);

    const modal = document.createElement("div");
    modal.className = "modal";
    backdrop.appendChild(modal);

    function dismiss() {
      backdrop.classList.remove("visible");
      setTimeout(() => host.remove(), 200);
    }

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) dismiss();
    });

    let activeState = "list";

    function renderListState() {
      activeState = "list";
      modal.replaceChildren();

      const header = document.createElement("div");
      header.className = "modal-header";
      modal.appendChild(header);

      const titleEl = document.createElement("h2");
      titleEl.className = "modal-title";
      titleEl.textContent = menuLabel;
      header.appendChild(titleEl);

      const closeBtn = document.createElement("button");
      closeBtn.className = "close-btn";
      closeBtn.title = "Close";
      closeBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      closeBtn.addEventListener("click", dismiss);
      header.appendChild(closeBtn);

      const body = document.createElement("div");
      body.className = "modal-body";
      modal.appendChild(body);

      if (list.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        body.appendChild(empty);

        const emptyTitle = document.createElement("div");
        emptyTitle.className = "empty-state-title";
        emptyTitle.textContent = `No ${menuLabel} files created yet`;
        empty.appendChild(emptyTitle);

        const emptyText = document.createElement("div");
        emptyText.className = "empty-state-text";
        if (docType === "personal") {
          emptyText.textContent = "Complete the 10-question interview on PersonaMD to generate your communication profile.";
        } else if (docType === "project") {
          emptyText.textContent = "Complete the 14-question Project interview on PersonaMD to document your tech stack.";
        } else {
          emptyText.textContent = "Create your project profiles or combine them into a Skill.md document first.";
        }
        empty.appendChild(emptyText);

        const emptyBtn = document.createElement("button");
        emptyBtn.className = "empty-state-btn";
        emptyBtn.textContent = "Start Interview on PersonaMD";
        emptyBtn.addEventListener("click", () => {
          safeSendMessage({ type: "GET_SETTINGS" }, (resp) => {
            const baseUrl = (resp && resp.settings && resp.settings.baseUrl) || "http://localhost:3000";
            let path = "/";
            if (docType === "project") path = "/skills/new?mode=project";
            else if (docType === "skills") path = "/recovery?tab=skills";
            window.open(baseUrl.replace(/\/$/, "") + path, "_blank");
          });
        });
        empty.appendChild(emptyBtn);

      } else {
        const listDiv = document.createElement("div");
        listDiv.className = "picker-list";
        body.appendChild(listDiv);

        list.forEach((item) => {
          const row = document.createElement("div");
          row.className = "picker-row";

          const meta = document.createElement("div");
          meta.className = "picker-meta";

          const nameRow = document.createElement("div");
          nameRow.className = "picker-name-row";

          const nameEl = document.createElement("h3");
          nameEl.className = "picker-name";
          nameEl.textContent = item.name + ".md";
          nameRow.appendChild(nameEl);

          const badge = document.createElement("span");
          badge.className = `picker-badge picker-badge-${item.type.toLowerCase()}`;
          badge.textContent = item.type;
          nameRow.appendChild(badge);

          meta.appendChild(nameRow);

          const details = document.createElement("div");
          details.className = "picker-details";
          
          let dateStr = "updated recently";
          if (item.updatedAt) {
            try {
              const diffMs = Date.now() - new Date(item.updatedAt).getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMins / 60);
              const diffDays = Math.floor(diffHours / 24);
              if (diffDays > 0) dateStr = `${diffDays}d ago`;
              else if (diffHours > 0) dateStr = `${diffHours}h ago`;
              else if (diffMins > 0) dateStr = `${diffMins}m ago`;
              else dateStr = "just now";
            } catch {}
          }
          
          details.textContent = `${dateStr} • ${item.sizeKb || "0.0"} KB`;
          meta.appendChild(details);

          row.appendChild(meta);

          const action = document.createElement("span");
          action.className = "picker-action";
          action.textContent = "Select →";
          row.appendChild(action);

          row.addEventListener("click", () => {
            row.classList.add("loading");
            action.textContent = "Fetching…";

            safeSendMessage({ type: "PERSONAMD_GET_LIBRARY_DOC", doc: docType, id: item.id }, (response) => {
              row.classList.remove("loading");
              action.textContent = "Select →";

              if (!response || !response.ok) {
                alert("Error fetching document content.");
                return;
              }
              renderContentState(response.markdown, item.name + ".md");
            });
          });

          listDiv.appendChild(row);
        });
      }

      const footer = document.createElement("div");
      footer.className = "modal-footer";
      modal.appendChild(footer);

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "modal-btn modal-btn-secondary";
      cancelBtn.textContent = "Close";
      cancelBtn.addEventListener("click", dismiss);
      footer.appendChild(cancelBtn);
    }

    function renderContentState(markdown, docTitle) {
      activeState = "content";
      modal.replaceChildren();

      const header = document.createElement("div");
      header.className = "modal-header";
      modal.appendChild(header);

      const backBtn = document.createElement("button");
      backBtn.className = "back-btn";
      backBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to list</span>
      `;
      backBtn.addEventListener("click", renderListState);
      header.appendChild(backBtn);

      const closeBtn = document.createElement("button");
      closeBtn.className = "close-btn";
      closeBtn.title = "Close";
      closeBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      closeBtn.addEventListener("click", dismiss);
      header.appendChild(closeBtn);

      const body = document.createElement("div");
      body.className = "modal-body";
      body.innerHTML = renderMarkdownToHtml(markdown);
      modal.appendChild(body);

      const footer = document.createElement("div");
      footer.className = "modal-footer";
      modal.appendChild(footer);

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "modal-btn modal-btn-secondary";
      cancelBtn.textContent = "Close";
      cancelBtn.addEventListener("click", dismiss);
      footer.appendChild(cancelBtn);

      const copyBtn = document.createElement("button");
      copyBtn.className = "modal-btn modal-btn-secondary";
      copyBtn.textContent = "Copy to Clipboard";
      copyBtn.addEventListener("click", async () => {
        const ok = await copyToClipboard(markdown);
        if (ok) {
          copyBtn.textContent = "Copied ✓";
          copyBtn.style.borderColor = "rgba(52,199,89,0.5)";
          copyBtn.style.color = "#12805c";
          setTimeout(() => {
            copyBtn.textContent = "Copy to Clipboard";
            copyBtn.style.borderColor = "";
            copyBtn.style.color = "";
          }, 2000);
        }
      });
      footer.appendChild(copyBtn);

      const composerEl = findVisible(composerSelectors);
      if (composerEl) {
        const insertBtn = document.createElement("button");
        insertBtn.className = "modal-btn modal-btn-primary";
        insertBtn.textContent = "Insert into Composer";
        insertBtn.addEventListener("click", () => {
          try {
            setComposerText(composerEl, markdown);
            insertBtn.textContent = "Inserted ✓";
            insertBtn.style.backgroundColor = "#34c759";
            setTimeout(() => {
              dismiss();
            }, 800);
          } catch {
            insertBtn.textContent = "Failed ✗";
            insertBtn.style.backgroundColor = "#ff3b30";
            setTimeout(() => {
              insertBtn.textContent = "Insert into Composer";
              insertBtn.style.backgroundColor = "";
            }, 2000);
          }
        });
        footer.appendChild(insertBtn);
      }
    }

    renderListState();

    document.documentElement.appendChild(host);

    backdrop.getBoundingClientRect();
    backdrop.classList.add("visible");
  }

  /**
   * Generic, provider-agnostic fallback extractor. Used by providers we
   * don't have precise selectors for yet (or as a safety net if a
   * provider's own selectors fail). Looks for common chat-UI conventions --
   * ARIA roles, data-testid/data-role/data-author attributes, and class
   * names containing "message"/"turn"/"bubble" -- rather than any one
   * provider's exact markup. Confidence is inherently lower than a
   * hand-tuned selector; that's expected and fine as a fallback.
   */
  function genericExtract(providerName) {
    const CANDIDATE_SELECTORS = [
      "[data-message-author-role]",
      "[data-testid*='message']",
      "[data-role='user'], [data-role='assistant']",
      "[class*='message-bubble']",
      "[class*='chat-message']",
      "[role='listitem']",
    ];

    let turns = [];
    for (const sel of CANDIDATE_SELECTORS) {
      turns = Array.from(document.querySelectorAll(sel));
      if (turns.length > 0) break;
    }

    if (turns.length === 0) {
      return {
        ok: false,
        error:
          "No messages found on this page. If this is a new chat, please start the conversation first.",
      };
    }

    function guessRole(el, index) {
      const attr =
        el.getAttribute("data-message-author-role") ||
        el.getAttribute("data-role") ||
        el.getAttribute("data-author") ||
        "";
      if (/user/i.test(attr)) return "user";
      if (/assistant|model|bot|ai/i.test(attr)) return "assistant";
      const cls = el.className || "";
      if (/user/i.test(String(cls))) return "user";
      if (/assistant|model|bot|ai/i.test(String(cls))) return "assistant";
      // Last resort: alternate, assuming turns strictly alternate starting with the user.
      return index % 2 === 0 ? "user" : "assistant";
    }

    const messages = turns.map((el, i) => ({
      role: guessRole(el, i),
      content: el.innerText.trim(),
    })).filter((m) => m.content.length > 0);

    if (messages.length === 0) {
      return { ok: false, error: "Found message containers but no text content inside them." };
    }

    return {
      ok: true,
      conversation: {
        provider: providerName,
        title: document.title.trim() || "Untitled conversation",
        url: location.href,
        capturedAt: new Date().toISOString(),
        messages,
      },
    };
  }

  function findVisible(candidateSelectors) {
    for (const sel of candidateSelectors) {
      const el = document.querySelector(sel);
      if (el && el.getClientRects().length > 0) return el;
    }
    return null;
  }

  /** The dock target is the parent row of a found icon -- most composer
   * toolbars lay their icon buttons out as flex-row siblings, so the
   * immediate parentElement is almost always the right container to drop
   * our button into as another sibling. */
  function findDockContainer(dockAnchorSelectors) {
    const anchor = findVisible(dockAnchorSelectors);
    return anchor && anchor.parentElement ? { anchor, container: anchor.parentElement } : null;
  }

  /** True while this content script's connection to the extension is still
   * live. Once the extension is reloaded/updated (e.g. from chrome://extensions
   * during development, or an auto-update), any tab that had this script
   * injected before the reload keeps running with a dead `chrome.runtime` --
   * `chrome.runtime.id` becomes undefined, which is the standard way to
   * detect this without triggering the error itself. */
  function extensionAlive() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  /** Wraps chrome.runtime.sendMessage so a stale tab (see extensionAlive
   * above) degrades to a friendly `{ ok: false, error }` result instead of
   * an uncaught "Extension context invalidated" exception -- Chrome throws
   * that synchronously from sendMessage itself once the extension's been
   * reloaded, not just via chrome.runtime.lastError, so a plain try/catch at
   * the call site isn't enough on its own; every call needs to go through
   * this one path. `callback` is always invoked exactly once, synchronously
   * or not, with a response object that always has `.ok`. */
  function safeSendMessage(message, callback) {
    if (!extensionAlive()) {
      callback({ ok: false, error: RELOAD_MESSAGE });
      return;
    }
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          callback({ ok: false, error: chrome.runtime.lastError.message || RELOAD_MESSAGE });
          return;
        }
        callback(response || { ok: false, error: "No response from the extension." });
      });
    } catch (err) {
      callback({ ok: false, error: RELOAD_MESSAGE });
    }
  }

  /** Fills a text input/textarea or a contenteditable rich-text composer
   * with the given text and fires the events the page's own framework needs
   * to notice the change.
   *
   * NOTE ON FRAGILITY: ChatGPT/Claude/etc. composers are custom rich-text
   * editors (Lexical/ProseMirror-style), not plain <textarea>s, in their
   * current markup. execCommand("insertText") is deprecated but remains the
   * most broadly-compatible way to inject text into that kind of editor
   * from outside its own React tree -- a raw textContent assignment doesn't
   * reliably notify the editor's internal state. If a provider's composer
   * stops accepting pasted text this way, that's the first thing to
   * re-verify in devtools. */
  function setComposerText(el, text) {
    el.focus();
    const tag = el.tagName;
    if (tag === "TEXTAREA" || tag === "INPUT") {
      const proto = tag === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    document.execCommand("selectAll", false);
    document.execCommand("insertText", false, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function downloadMarkdown(filename, text) {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "conversation-handoff.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard API can fail without a secure focus context in some
      // embedded/iframe cases -- fall back to the old execCommand trick.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
        return true;
      } catch {
        return false;
      }
    }
  }

  function mount(config) {
    const {
      extractConversation,
      anchorSelectors = [],
      dockAnchorSelectors = [],
      composerSelectors = [],
    } = config;

    const host = document.createElement("div");
    host.id = HOST_ID;
    host.setAttribute("provider", config.provider);
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    shadow.appendChild(style);

    const group = document.createElement("div");
    group.className = "group";
    shadow.appendChild(group);

    function makeButton(idleIconKey, title) {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.title = title;
      btn.type = "button";
      const icon = document.createElement("span");
      icon.className = "icon";
      icon.appendChild(buildIcon(idleIconKey));
      btn.appendChild(icon);

      function setState(state) {
        btn.classList.remove("saving", "success", "error");
        if (state) btn.classList.add(state);
        icon.replaceChildren(buildIcon(state || idleIconKey));
      }

      return { btn, setState };
    }

    // --- Single menu button ----------------------------------------------
    // Only appears when this provider's script gave us composerSelectors to
    // target -- the doc items need a composer to paste into, and keeping
    // every action (Save, Share) in this same menu means the whole
    // "do something with this conversation" surface is one button, not a
    // row of icons competing for space in the composer.
    //
    // Everything below is wrapped in try/catch: this used to be a bare
    // block, which meant a single unexpected error while building the menu
    // (e.g. an unusual page layout) could throw and skip every line after
    // it in this function -- including attemptPlacement() further down --
    // so the whole widget would silently fail to appear at all, with no
    // console output pointing at why. Catching here means a menu-building
    // failure logs a real error and the button still gets docked/floated
    // (even if empty), instead of vanishing outright.
    try {
      if (composerSelectors.length > 0) {
        const menuBtn = makeButton("insert", "Project.md / Skills.md / Library.md / Save / Share");
        group.appendChild(menuBtn.btn);

        // Own top-level host so the popup is never subject to the docked
        // button's ancestor overflow/clipping -- see the MENU_STYLE comment
        // above for why this is a separate host instead of living in `shadow`.
        const menuHost = document.createElement("div");
        menuHost.id = HOST_ID + "-menu";
        const menuShadow = menuHost.attachShadow({ mode: "open" });
        const menuStyleEl = document.createElement("style");
        menuStyleEl.textContent = MENU_STYLE;
        menuShadow.appendChild(menuStyleEl);

        const menu = document.createElement("div");
        menu.className = "menu";
        menuShadow.appendChild(menu);

        let menuOpen = false;

        /** Positions the menu near the button, flipping upward/leftward when
         * there's not enough space, so the menu never renders off-screen even
         * when the button has been dragged to an edge. */
        function positionMenu() {
          const rect = menuBtn.btn.getBoundingClientRect();
          const MENU_W = 240; // approximate max menu width
          const MENU_H = 280; // approximate max menu height
          const GAP = 10;

          // Vertical: prefer above the button; flip below if not enough room
          const spaceAbove = rect.top - GAP;
          const spaceBelow = window.innerHeight - rect.bottom - GAP;
          if (spaceAbove >= MENU_H || spaceAbove >= spaceBelow) {
            menu.style.bottom = `${Math.max(8, window.innerHeight - rect.top + GAP)}px`;
            menu.style.top = "auto";
          } else {
            menu.style.top = `${Math.max(8, rect.bottom + GAP)}px`;
            menu.style.bottom = "auto";
          }

          // Horizontal: right-align to button right edge; flip left if not enough room
          const spaceRight = window.innerWidth - rect.right;
          if (spaceRight >= MENU_W) {
            menu.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
            menu.style.left = "auto";
          } else {
            menu.style.left = `${Math.max(8, rect.left)}px`;
            menu.style.right = "auto";
          }
        }

        function openMenu() {
          if (!menuHost.isConnected) document.documentElement.appendChild(menuHost);
          positionMenu();
          menu.classList.add("open");
          menuOpen = true;
          // Closing on outside click needs to see through both shadow roots --
          // composed:true events (like a real click) bubble out past them, so a
          // plain document-level listener still sees this page's own clicks.
          document.addEventListener("click", handleOutsideClick, true);
        }

        function closeMenu() {
          menu.classList.remove("open");
          menuOpen = false;
          document.removeEventListener("click", handleOutsideClick, true);
        }

        function handleOutsideClick(ev) {
          // composedPath() (rather than ev.target) is needed here because the
          // menu now lives in a second, separate shadow host from the button --
          // ev.target alone only retargets to whichever single host the click
          // actually landed in, so checking composedPath against both keeps
          // clicks on either the button or the popup from closing it.
          const path = ev.composedPath();
          if (path.includes(host) || path.includes(menuHost)) return;
          closeMenu();
        }

        MENU_ITEMS.forEach((entry) => {
          if (entry.divider) {
            menu.appendChild(document.createElement("hr")).className = "menu-divider";
          }

          const item = document.createElement("button");
          item.type = "button";
          item.className = "menu-item";
          const labelSpan = document.createElement("span");
          labelSpan.className = "label";
          labelSpan.textContent = entry.label;
          const hintSpan = document.createElement("span");
          hintSpan.className = "hint";
          hintSpan.textContent = entry.hint;
          item.appendChild(labelSpan);
          item.appendChild(hintSpan);
          menu.appendChild(item);

          function setItemState(state, hintText) {
            item.classList.remove("loading", "error", "success");
            if (state) item.classList.add(state);
            const hintEl = item.querySelector(".hint");
            if (hintEl) hintEl.textContent = hintText || entry.hint;
          }

          function finishItem(delay) {
            insertBtnFlash();
            closeMenu();
            setTimeout(() => setItemState(null), delay);
          }

          function insertBtnFlash() {
            menuBtn.setState("success");
            setTimeout(() => menuBtn.setState(null), 1800);
          }

          item.addEventListener("click", (ev) => {
            ev.stopPropagation();
            if (item.classList.contains("loading")) return;

            if (entry.type === "save") {
              setItemState("loading", "Saving…");

              let result;
              try {
                result = extractConversation();
              } catch (err) {
                result = { ok: false, error: String(err && err.message ? err.message : err) };
              }

              if (!result || !result.ok) {
                setItemState("error", (result && result.error) || "Nothing to save");
                setTimeout(() => setItemState(null), 2500);
                return;
              }

              safeSendMessage({ type: "PERSONAMD_MANUAL_CAPTURE", conversation: result.conversation }, (response) => {
                if (!response || !response.ok) {
                  setItemState("error", (response && response.error) || "Save failed");
                  setTimeout(() => setItemState(null), 2500);
                  return;
                }
                setItemState("success", "Saved ✓");
                finishItem(1500);
              });
              return;
            }

            if (entry.type === "share") {
              setItemState("loading", "Processing…");

              let result;
              try {
                result = extractConversation();
              } catch (err) {
                result = { ok: false, error: String(err && err.message ? err.message : err) };
              }

              if (!result || !result.ok) {
                setItemState("error", (result && result.error) || "Nothing to share");
                setTimeout(() => setItemState(null), 2500);
                return;
              }

              safeSendMessage({ type: "PERSONAMD_SHARE", conversation: result.conversation }, async (response) => {
                if (!response || !response.ok) {
                  setItemState("error", (response && response.error) || "Share failed");
                  setTimeout(() => setItemState(null), 3000);
                  return;
                }
                await copyToClipboard(response.markdown);
                downloadMarkdown(response.title, response.markdown);
                setItemState(
                  "success",
                  response.usedAI ? "Copied + downloaded (AI-summarized) ✓" : "Copied + downloaded (no AI key set) ✓"
                );
                finishItem(2200);
              });
              return;
            }

            if (entry.key === "library") {
              setItemState("loading", "Fetching…");
              safeSendMessage({ type: "PERSONAMD_GET_LIBRARY_DOC", doc: entry.key }, (response) => {
                if (!response || !response.ok) {
                  setItemState("error", (response && response.error) || "Couldn't fetch this document.");
                  setTimeout(() => setItemState(null), 2500);
                  return;
                }

                try {
                  showMarkdownModal(entry.label, response.markdown, composerSelectors);
                  setItemState("success", "Opened ✓");
                  finishItem(1200);
                } catch (err) {
                  console.error(err);
                  setItemState("error", "Couldn't open the document.");
                  menuBtn.setState("error");
                  setTimeout(() => setItemState(null), 2500);
                }
              });
            } else {
              setItemState("loading", "Loading list…");
              safeSendMessage({ type: "PERSONAMD_GET_LIBRARY_LIST", doc: entry.key }, (response) => {
                if (!response || !response.ok) {
                  setItemState("error", (response && response.error) || "Couldn't load documents.");
                  setTimeout(() => setItemState(null), 2500);
                  return;
                }

                try {
                  showPickerOrContentModal(entry.label, entry.key, response.list, composerSelectors);
                  setItemState("success", "Opened ✓");
                  finishItem(1200);
                } catch (err) {
                  console.error(err);
                  setItemState("error", "Couldn't open the menu.");
                  menuBtn.setState("error");
                  setTimeout(() => setItemState(null), 2500);
                }
              });
            }
          });
        });

        menuBtn.btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (menuOpen) closeMenu();
          else openMenu();
        });

        window.addEventListener("beforeunload", () => {
          document.removeEventListener("click", handleOutsideClick, true);
        });
      }
    } catch (err) {
      console.error("Noetis: failed to build the composer menu, continuing without it.", err);
    }

    // --- Drag + persistence ----------------------------------------------
    // Key pattern: buttonPosition:<hostname>
    const POSITION_KEY = "buttonPosition:" + location.hostname;
    const DRAG_THRESHOLD = 5; // px — below this, treat as a click

    // True while the user has a custom dragged-to position stored/active.
    let customPositioned = false;

    /** Clamp a coordinate so the button stays on-screen. */
    function clampPos(x, y, w, h) {
      return {
        x: Math.min(Math.max(0, x), window.innerWidth  - w),
        y: Math.min(Math.max(0, y), window.innerHeight - h),
      };
    }

    /** Switch the host to fixed position at the given viewport coordinates. */
    function applyFixedPosition(x, y) {
      const rect  = host.getBoundingClientRect();
      const w     = rect.width  || 36;
      const h     = rect.height || 36;
      const clamped = clampPos(x, y, w, h);
      host.style.position = "fixed";
      host.style.left     = clamped.x + "px";
      host.style.top      = clamped.y + "px";
      host.style.right    = "auto";
      host.style.bottom   = "auto";
      host.style.display  = "flex";
      host.style.alignItems    = "center";
      host.style.justifyContent = "center";
      host.style.zIndex   = "2147483647";
      host.style.flex     = "none";
      // Make sure the host lives at the top of the DOM so fixed works
      if (!host.isConnected || host.parentElement !== document.documentElement) {
        document.documentElement.appendChild(host);
      }
      group.classList.add("floating");
      group.style.position = "";
      group.style.top      = "";
      group.style.left     = "";
      group.style.right    = "";
      group.style.bottom   = "";
      docked = false;
      customPositioned = true;
    }

    /** Load saved position from storage and apply it; returns a Promise<bool>. */
    function restoreSavedPosition() {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get([POSITION_KEY], (result) => {
            const pos = result && result[POSITION_KEY];
            if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
              applyFixedPosition(pos.x, pos.y);
              resolve(true);
            } else {
              resolve(false);
            }
          });
        } catch {
          resolve(false);
        }
      });
    }

    /** Save current fixed position to storage. */
    function savePosition(x, y) {
      try {
        chrome.storage.local.set({ [POSITION_KEY]: { x, y } });
      } catch { /* non-fatal */ }
    }

    /** Clear the saved position for this hostname and revert to docked. */
    function clearSavedPosition() {
      try {
        chrome.storage.local.remove([POSITION_KEY], () => {
          customPositioned = false;
          docked = false;
          // Force next attemptPlacement to re-dock
          if (host.isConnected) host.remove();
          host.style.position = "";
          host.style.left = "";
          host.style.top  = "";
          host.style.right  = "";
          host.style.bottom = "";
          host.style.zIndex = "";
        });
      } catch { /* non-fatal */ }
    }

    // Expose reset so popup.js can trigger it via a content-script message
    // (handled in background.js relay) and so provider scripts can call it.
    window.__noetisResetPosition = clearSavedPosition;

    // Re-clamp on resize so the button can't get stranded off-screen.
    window.addEventListener("resize", () => {
      if (!customPositioned) return;
      const rect = host.getBoundingClientRect();
      const w = rect.width  || 36;
      const h = rect.height || 36;
      const cur = clampPos(parseFloat(host.style.left) || 0,
                           parseFloat(host.style.top)  || 0, w, h);
      host.style.left = cur.x + "px";
      host.style.top  = cur.y + "px";
      savePosition(cur.x, cur.y);
    });

    // --- Wire drag to the button element (inside shadow) -----------------
    // We attach to the shadow btn element once it's available.
    // The drag handler is shared across mouse and touch.
    function attachDragHandlers(btnEl) {
      let dragActive   = false;
      let startX       = 0;
      let startY       = 0;
      let startLeft    = 0;
      let startTop     = 0;
      let didDrag      = false;
      let rafId        = null;
      let pendingX     = 0;
      let pendingY     = 0;

      function onDragStart(clientX, clientY) {
        startX = clientX;
        startY = clientY;
        // Capture current position in viewport coords
        const rect = host.getBoundingClientRect();
        startLeft = rect.left;
        startTop  = rect.top;
        dragActive = true;
        didDrag    = false;
        pendingX   = startLeft;
        pendingY   = startTop;
      }

      function onDragMove(clientX, clientY) {
        if (!dragActive) return;
        const dx = clientX - startX;
        const dy = clientY - startY;
        if (!didDrag && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

        if (!didDrag) {
          // First real move — switch to fixed mode
          didDrag = true;
          btnEl.classList.add("dragging");
          // If we were docked, un-dock first so fixed works properly
          if (docked || !customPositioned) {
            applyFixedPosition(startLeft, startTop);
          }
        }

        const w   = host.offsetWidth  || 36;
        const h   = host.offsetHeight || 36;
        const pos = clampPos(startLeft + dx, startTop + dy, w, h);
        pendingX  = pos.x;
        pendingY  = pos.y;

        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            host.style.left = pendingX + "px";
            host.style.top  = pendingY + "px";
          });
        }
      }

      function onDragEnd() {
        if (!dragActive) return;
        dragActive = false;
        btnEl.classList.remove("dragging");
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

        if (didDrag) {
          const x = parseFloat(host.style.left) || 0;
          const y = parseFloat(host.style.top)  || 0;
          savePosition(x, y);
          customPositioned = true;
        }
        didDrag = false;
      }

      // Mouse
      btnEl.addEventListener("mousedown", (ev) => {
        if (ev.button !== 0) return; // left button only
        ev.preventDefault();
        onDragStart(ev.clientX, ev.clientY);

        function onMouseMove(e) { onDragMove(e.clientX, e.clientY); }
        function onMouseUp()    { onDragEnd(); document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp); }
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup",   onMouseUp);
      });

      // Touch
      btnEl.addEventListener("touchstart", (ev) => {
        if (ev.touches.length !== 1) return;
        const t = ev.touches[0];
        onDragStart(t.clientX, t.clientY);

        function onTouchMove(e) {
          if (e.touches.length !== 1) return;
          const t2 = e.touches[0];
          onDragMove(t2.clientX, t2.clientY);
          if (didDrag) e.preventDefault(); // block page scroll while dragging
        }
        function onTouchEnd() { onDragEnd(); document.removeEventListener("touchmove", onTouchMove); document.removeEventListener("touchend", onTouchEnd); }
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend",  onTouchEnd);
      }, { passive: true });

      // Block click from firing after a drag (threshold protects normal clicks)
      btnEl.addEventListener("click", (ev) => {
        if (didDrag) { ev.stopImmediatePropagation(); ev.preventDefault(); didDrag = false; }
      }, true);
    }

    // --- Placement -------------------------------------------------------
    let docked = false;

    function dockInto(dock) {
      // Insert as the sibling immediately before the anchor element so it sits
      // inline in the composer's button row immediately before the model selector.
      dock.anchor.insertAdjacentElement("beforebegin", host);

      // The host is a plain light-DOM <div> with no layout styles of its
      // own. If the composer's icon row is a flex container, an unstyled
      // block-level div can still force a line wrap (or just look
      // misaligned) instead of sitting inline with its siblings. Force it
      // to behave like a same-sized flex/inline item so it lines up with
      // the native icon buttons instead of dropping to its own row.
      host.style.display = "inline-flex";
      host.style.alignItems = "center";
      host.style.justifyContent = "center";
      host.style.verticalAlign = "middle";
      host.style.flex = "0 0 auto";
      host.style.lineHeight = "0";

      group.classList.remove("floating");
      docked = true;
    }

    function floatNear(anchorEl) {
      document.documentElement.appendChild(host);
      group.classList.add("floating");
      docked = false;
      if (anchorEl) {
        // These used to be tuned for a wider pill-shaped button with a text
        // label ("Save to Noetis"); now the group is a single 36px circle
        // (BTN_SIZE), so the old fixed "-132" / "-18" offsets left it
        // overlapping the anchor instead of sitting cleanly beside it.
        // Center vertically on the anchor and place it just to the left
        // with a small fixed gap, so it lines up regardless of the
        // anchor's own size.
        const rect = anchorEl.getBoundingClientRect();
        const BTN_SIZE = 36;
        const GAP = 10;
        group.style.top = `${Math.max(8, rect.top + rect.height / 2 - BTN_SIZE / 2)}px`;
        group.style.left = `${Math.max(8, rect.left - BTN_SIZE - GAP)}px`;
        group.style.right = "auto";
        group.style.bottom = "auto";
      } else {
        group.style.top = "auto";
        group.style.left = "auto";
        group.style.right = "24px";
        group.style.bottom = "24px";
      }
    }

    // Declared before attemptPlacement uses it (and assigned only after the
    // interval actually starts) so the very first, synchronous
    // attemptPlacement() call below can't hit a temporal-dead-zone
    // ReferenceError on placementInterval.
    let placementInterval = null;

    function attemptPlacement() {
      // If the extension itself was reloaded, this tab's copy of the widget
      // is permanently stale (it can never reach the background worker
      // again) -- stop repositioning it forever instead of quietly burning
      // a timer every 500ms on a page the person may leave open all day.
      if (!extensionAlive()) {
        if (placementInterval) clearInterval(placementInterval);
        return;
      }

      // User dragged the button to a custom position -- respect that and
      // don't try to re-dock it on every tick.
      if (customPositioned && host.isConnected) return;

      try {
        // If we're already docked and still attached to a live container in
        // the document, leave it alone -- re-appending on every tick would
        // otherwise fight with the page's own re-renders unnecessarily.
        if (docked && host.isConnected) return;

        const dock = findDockContainer(dockAnchorSelectors);
        if (dock) {
          dockInto(dock);
          return;
        }

        floatNear(findVisible(anchorSelectors));
      } catch (err) {
        console.error("Noetis: placement attempt failed, will retry.", err);
      }
    }

    // Check for a saved custom position first; only start the normal dock
    // loop if none is found.
    restoreSavedPosition().then((restored) => {
      if (!restored) attemptPlacement();
      placementInterval = setInterval(attemptPlacement, CHECK_INTERVAL_MS);
    });

    // Attach drag handlers to the first button found in the shadow root.
    // We wait one tick for the shadow children to be fully rendered.
    setTimeout(() => {
      const btnEl = shadow.querySelector(".btn");
      if (btnEl) attachDragHandlers(btnEl);
    }, 0);

    window.addEventListener("beforeunload", () => {
      clearInterval(placementInterval);
    });

    return {};
  }

  window.NoetisCapture = { mount, genericExtract };

  // Listen for the "Reset Position" message sent by popup.js so the button
  // reverts to its docked placement immediately on the live page without a
  // reload.  The handler delegates to window.__noetisResetPosition, which is
  // registered by mount() after it runs.
  try {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "PERSONAMD_RESET_POSITION") {
        if (typeof window.__noetisResetPosition === "function") {
          window.__noetisResetPosition();
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, error: "Widget not mounted yet." });
        }
        return true;
      }
    });
  } catch { /* non-fatal: extension may be unloaded */ }
})();
