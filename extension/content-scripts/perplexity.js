// Captures the visible conversation on a perplexity.ai tab.
//
// NOTE ON FRAGILITY (read before debugging): written without live access to
// Perplexity's current DOM -- the selectors below are a best-effort guess,
// not verified. If capture returns 0 messages, open devtools on a
// conversation, inspect a query block and an answer block, and update
// SELECTOR_STRATEGIES. The generic fallback (window.NoetisCapture.genericExtract)
// keeps capture working at reduced accuracy in the meantime.
(function () {
  const SELECTOR_STRATEGIES = [
    {
      user: "[data-testid='thread-query'], .query-text",
      assistant: "[data-testid='thread-answer'], .prose",
    },
  ];

  function extractConversation() {
    let userEls = [];
    let assistantEls = [];

    for (const strategy of SELECTOR_STRATEGIES) {
      userEls = Array.from(document.querySelectorAll(strategy.user));
      assistantEls = Array.from(document.querySelectorAll(strategy.assistant));
      if (userEls.length > 0 || assistantEls.length > 0) break;
    }

    if (userEls.length === 0 && assistantEls.length === 0) {
      return window.NoetisCapture
        ? window.NoetisCapture.genericExtract("perplexity")
        : { ok: false, error: "No message turns found on this page." };
    }

    const tagged = [
      ...userEls.map((el) => ({ el, role: "user" })),
      ...assistantEls.map((el) => ({ el, role: "assistant" })),
    ].sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    const messages = tagged
      .map(({ el, role }) => ({ role, content: el.innerText.trim() }))
      .filter((m) => m.content.length > 0);

    if (messages.length === 0) {
      return { ok: false, error: "Found message containers but no text content inside them." };
    }

    const title = document.title.replace(/\s*[-|]\s*Perplexity\s*$/i, "").trim() || "Untitled conversation";

    return {
      ok: true,
      conversation: {
        provider: "perplexity",
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
  });

  if (window.NoetisCapture) {
    window.NoetisCapture.mount({
      provider: "perplexity",
      extractConversation,
      dockAnchorSelectors: [
        'button[aria-haspopup="menu"]',
        'button[aria-label*="model" i]',
        'button[aria-label*="pro" i]',
        'button[aria-label*="voice" i]',
        'button[aria-label*="attach" i]'
      ],
      anchorSelectors: ['button[aria-label="Submit"]', 'button[type="submit"]'],
      // Best-effort guess (no live DOM access) -- used only by the "Paste" button.
      composerSelectors: ['textarea', 'div[contenteditable="true"]'],
    });
  }
})();
