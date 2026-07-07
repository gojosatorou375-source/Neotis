// Captures the visible conversation on a chat.deepseek.com tab.
//
// NOTE ON FRAGILITY (read before debugging): written without live access to
// DeepSeek's current DOM, so this relies entirely on the generic role-based
// fallback extractor (window.NoetisCapture.genericExtract) rather than
// guessing exact class names. If capture comes back empty or with garbled
// role assignment, open devtools on a DeepSeek conversation, inspect a user
// turn and an assistant turn, and add a proper SELECTOR_STRATEGIES entry
// here (see gemini.js for the pattern) instead of relying on the generic
// fallback.
(function () {
  function extractConversation() {
    if (!window.NoetisCapture) {
      return { ok: false, error: "Capture widget failed to load." };
    }
    return window.NoetisCapture.genericExtract("deepseek");
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "PERSONAMD_CAPTURE") {
      sendResponse(extractConversation());
      return true;
    }
  });

  if (window.NoetisCapture) {
    window.NoetisCapture.mount({
      provider: "deepseek",
      extractConversation,
      dockAnchorSelectors: [
        'button[aria-haspopup="menu"]',
        'button[aria-label*="model" i]',
        'button[aria-label*="deepseek" i]',
        'button[aria-label*="voice" i]',
        'button[aria-label*="attach" i]'
      ],
      anchorSelectors: ['button[aria-label="Send"]', 'button[type="submit"]'],
      // Best-effort guess (no live DOM access) -- used only by the "Paste" button.
      composerSelectors: ['textarea', 'div[contenteditable="true"]'],
    });
  }
})();
