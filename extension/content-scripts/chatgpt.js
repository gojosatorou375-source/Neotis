// Captures the visible conversation on a chatgpt.com / chat.openai.com tab.
//
// NOTE ON FRAGILITY: this reads the live DOM rather than calling an official
// export API (OpenAI doesn't offer one for real-time/automatic access -- only
// a manual "export all data" request that arrives by email). ChatGPT's DOM
// structure can change with any deploy, which will silently break the
// selectors below. If capture stops working, open devtools on a conversation
// page, inspect a message bubble, and update SELECTORS to match.
(function () {
  const SELECTORS = {
    // Each turn is a container with this attribute set to "user" or "assistant".
    turn: "[data-message-author-role]",
    roleAttr: "data-message-author-role",
    title: 'title, h1, [data-testid="conversation-title"]',
    // Sidebar history links look like <a href="/c/<uuid>">Title</a>.
    sidebarLink: 'nav a[href^="/c/"]',
  };

  function listConversations() {
    const links = Array.from(document.querySelectorAll(SELECTORS.sidebarLink));
    if (links.length === 0) {
      return { ok: false, error: "No conversation list found in the sidebar. Is it open?" };
    }
    const seen = new Set();
    const conversations = [];
    for (const a of links) {
      const href = a.getAttribute("href");
      if (!href || seen.has(href)) continue;
      seen.add(href);
      conversations.push({
        url: new URL(href, location.origin).href,
        title: a.textContent.trim() || "Untitled conversation",
      });
    }
    return { ok: true, conversations };
  }

  function extractConversation() {
    const turns = Array.from(document.querySelectorAll(SELECTORS.turn));
    if (turns.length === 0) {
      return { ok: false, error: "No message turns found on this page. Open a conversation first." };
    }

    const messages = turns.map((el) => ({
      role: el.getAttribute(SELECTORS.roleAttr) || "unknown",
      content: el.innerText.trim(),
    }));

    const titleEl = document.querySelector(SELECTORS.title);
    const title =
      (titleEl && titleEl.textContent && titleEl.textContent.trim()) ||
      document.title.replace(/\s*[-|]\s*ChatGPT\s*$/i, "").trim() ||
      "Untitled conversation";

    return {
      ok: true,
      conversation: {
        provider: "chatgpt",
        title,
        url: location.href,
        capturedAt: new Date().toISOString(),
        messages,
      },
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "PERSONAMD_CAPTURE") {
      sendResponse(extractConversation());
      return true;
    }
    if (message?.type === "PERSONAMD_LIST_CONVERSATIONS") {
      sendResponse(listConversations());
      return true;
    }
  });

  // --- Usage-limit detection -------------------------------------------
  // NOTE ON FRAGILITY: this is a plain-text phrase scan, not an API signal
  // (there isn't one) -- if ChatGPT rewords its limit banner, update
  // LIMIT_PHRASES. Kept deliberately broad/generic since exact wording shifts
  // over time and by plan tier.
  const LIMIT_PHRASES = [
    /reached (your|the) (current )?(usage|message) (cap|limit)/i,
    /you.?ve hit the free plan limit/i,
    /message limit/i,
    /usage limit/i,
    /try again after/i,
    /upgrade to (continue|get more messages)/i,
  ];

  let limitAlreadyReported = false;

  function scanForLimitBanner() {
    if (limitAlreadyReported) return;
    const text = document.body.innerText || "";
    if (!LIMIT_PHRASES.some((re) => re.test(text))) return;

    const result = extractConversation();
    if (!result.ok) return; // nothing meaningful to capture yet

    limitAlreadyReported = true;
    chrome.runtime.sendMessage({ type: "PERSONAMD_LIMIT_DETECTED", conversation: result.conversation });
  }

  let scanTimeout = null;
  const observer = new MutationObserver(() => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scanForLimitBanner, 800);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scanForLimitBanner(); // in case the banner is already showing on load

  // --- In-page "Save to Noetis" button -----------------------------------
  // Docks inline in the composer's own icon row (next to the mic/voice
  // buttons) when it can find one of those icons -- see capture-widget.js,
  // loaded just before this file (manifest.json order matters). Falls back
  // to floating near the Send button, then to a fixed corner. ChatGPT's
  // Send button only exists in the DOM once you've typed something, which is
  // why dockAnchorSelectors targets the mic/voice icons instead -- those are
  // present even on an empty composer. All selectors here are best-effort;
  // ChatGPT has changed this markup before, so if the button ends up in the
  // fallback bottom-right corner instead of docked in the composer, inspect
  // the composer in devtools and add the current selector to the front of
  // the relevant list.
  if (window.NoetisCapture) {
    window.NoetisCapture.mount({
      provider: "chatgpt",
      extractConversation,
      dockAnchorSelectors: [
        'button[aria-haspopup="menu"]',
        'button[aria-label*="model" i]',
        'button[data-testid*="model" i]',
        '[data-testid="composer-model-selector"]',
        'button[data-testid="composer-speech-button"]',
        'button[aria-label="Dictate button"]',
        'button[aria-label*="voice" i]',
        'button[aria-label*="dictate" i]',
      ],
      anchorSelectors: [
        'button[data-testid="send-button"]',
        'button[aria-label="Send message"]',
        'form button[type="submit"]',
      ],
      // Used only by the "Paste" button (fills this in with a handoff
      // shared from another provider). ChatGPT's composer is a
      // contenteditable rich-text div, not a <textarea>, in current markup.
      composerSelectors: [
        '#prompt-textarea',
        'div[contenteditable="true"]#prompt-textarea',
        'form div[contenteditable="true"]',
      ],
    });
  }
})();
