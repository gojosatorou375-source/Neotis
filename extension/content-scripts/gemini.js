// Captures the visible conversation on a gemini.google.com tab.
//
// NOTE ON FRAGILITY (read before debugging): unlike chatgpt.js/claude.js,
// this file was written without live access to Gemini's current DOM, so the
// selectors below are a best-effort guess based on commonly-seen patterns,
// not verified against a real page. If capture returns 0 messages, open
// devtools on a Gemini conversation, inspect a user turn and a model turn,
// and update SELECTOR_STRATEGIES below -- the generic fallback
// (window.NoetisCapture.genericExtract) will keep capture working at
// reduced accuracy in the meantime.
(function () {
  const SELECTOR_STRATEGIES = [
    {
      user: "user-query, .query-text",
      assistant: "model-response, .model-response-text, message-content",
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
        ? window.NoetisCapture.genericExtract("gemini")
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

    const title = document.title.replace(/\s*[-|]\s*Gemini\s*$/i, "").trim() || "Untitled conversation";

    return {
      ok: true,
      conversation: {
        provider: "gemini",
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
      provider: "gemini",
      extractConversation,
      dockAnchorSelectors: [
        'button[aria-haspopup="listbox"]',
        'button[aria-haspopup="menu"]',
        'button[aria-label*="model" i]',
        'button[aria-label*="Gemini" i]',
        'button[aria-label*="microphone" i]',
        'button[aria-label*="dictate" i]'
      ],
      anchorSelectors: [
        'button[aria-label="Send message"]',
        'button[aria-label="Submit"]',
        'button[mattooltip="Send message"]',
      ],
      // Best-effort guess (no live DOM access) -- used only by the "Paste" button.
      composerSelectors: ['rich-textarea div[contenteditable="true"]', 'div[contenteditable="true"]'],
    });
  }
})();
