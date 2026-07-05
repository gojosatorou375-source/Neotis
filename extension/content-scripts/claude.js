// Captures the visible conversation on a claude.ai tab.
//
// NOTE ON FRAGILITY: same caveat as the ChatGPT content script — Claude has
// no public real-time export API, so this reads the rendered DOM. Claude's
// selectors change more often than ChatGPT's; if capture returns 0 messages,
// open devtools on a conversation, inspect a user/assistant bubble, and
// update SELECTORS below. Two selector strategies are tried in order.
(function () {
  const SELECTOR_STRATEGIES = [
    {
      user: '[data-testid="user-message"]',
      assistant: '[data-testid="assistant-message"], [data-testid="chat-message"]',
    },
    {
      // Fallback: Claude wraps each turn in a font-user-message / font-claude-message class.
      user: ".font-user-message",
      assistant: ".font-claude-message",
    },
  ];

  // Sidebar history links look like <a href="/chat/<uuid>">Title</a>. This is
  // a guess at current markup and the most likely thing to need a tweak.
  const SIDEBAR_LINK_SELECTOR = 'a[href^="/chat/"]';

  function listConversations() {
    const links = Array.from(document.querySelectorAll(SIDEBAR_LINK_SELECTOR));
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
    let userEls = [];
    let assistantEls = [];

    for (const strategy of SELECTOR_STRATEGIES) {
      userEls = Array.from(document.querySelectorAll(strategy.user));
      assistantEls = Array.from(document.querySelectorAll(strategy.assistant));
      if (userEls.length > 0 || assistantEls.length > 0) break;
    }

    if (userEls.length === 0 && assistantEls.length === 0) {
      return { ok: false, error: "No message turns found on this page. Open a conversation first." };
    }

    // Merge both lists back into document order using their position in the DOM.
    const tagged = [
      ...userEls.map((el) => ({ el, role: "user" })),
      ...assistantEls.map((el) => ({ el, role: "assistant" })),
    ].sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    const messages = tagged.map(({ el, role }) => ({
      role,
      content: el.innerText.trim(),
    }));

    const title = document.title.replace(/\s*[-|]\s*Claude\s*$/i, "").trim() || "Untitled conversation";

    return {
      ok: true,
      conversation: {
        provider: "claude",
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
  // NOTE ON FRAGILITY: plain-text phrase scan, not an API signal (there
  // isn't one) — if Claude rewords its limit banner, update LIMIT_PHRASES.
  const LIMIT_PHRASES = [
    /reached (your|the) (usage|message) limit/i,
    /usage limit/i,
    /message limit/i,
    /your limit resets/i,
    /please wait until/i,
    /upgrade to (continue|get more messages)/i,
    /come back (later|tomorrow)/i,
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
})();
