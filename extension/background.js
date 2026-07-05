// Background service worker: stores captured conversations locally, exposes
// a right-click "Capture conversation" shortcut, and (if enabled) pushes each
// capture straight to a running PersonaMD dev server so it shows up in the
// app automatically without a manual file import.

const STORAGE_KEY = "personamd_captures";
const SETTINGS_KEY = "personamd_settings";
const DEFAULT_SETTINGS = { autoPush: true, baseUrl: "http://localhost:3000", accessKey: "" };
const MATCH_PATTERNS = ["https://chatgpt.com/*", "https://chat.openai.com/*", "https://claude.ai/*"];
// Caps how many conversations "Capture all recent" will walk through in one
// go — a safety valve against hammering the provider and against a batch
// running long enough that Chrome kills the (idle-limited) service worker.
const MAX_BATCH_SIZE = 20;

/** In-memory only — resets if the service worker restarts mid-batch. The
 * popup polls this via GET_BATCH_STATUS to show progress. */
let batchState = { running: false, total: 0, done: 0, currentTitle: "", results: [] };

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "personamd-capture",
    title: "Capture conversation for Noetis",
    contexts: ["page"],
    documentUrlPatterns: MATCH_PATTERNS,
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "personamd-capture" && tab?.id) {
    captureTab(tab.id).then(updateBadge);
  }
});

async function getSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
}

async function setSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

/** Best-effort push to the PersonaMD dev server. Never throws — capture
 * still succeeds locally even if the app isn't running. */
async function pushToServer(conversation) {
  const { autoPush, baseUrl, accessKey } = await getSettings();
  if (!autoPush) return { pushed: false, reason: "disabled" };

  // Timeout so a stuck/unresponsive server can't hold the popup's pending
  // reply open indefinitely (that's what leads to "message port closed"
  // errors — the popup gets closed by the user while still waiting).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessKey ? { "X-PersonaMD-Access": accessKey } : {}),
      },
      body: JSON.stringify(conversation),
      signal: controller.signal,
    });
    if (!res.ok) return { pushed: false, reason: `Server responded ${res.status}` };
    return { pushed: true };
  } catch (err) {
    const reason =
      err?.name === "AbortError"
        ? "Noetis dev server took too long to respond."
        : "Noetis dev server not reachable at " + baseUrl;
    return { pushed: false, reason };
  } finally {
    clearTimeout(timeout);
  }
}

/** Retries captureTab a few times with a pause in between, since a freshly
 * navigated tab often hasn't finished rendering messages yet — a single
 * fixed delay isn't reliable across different conversation lengths/network
 * speeds. Only retries on "page not ready yet" failures. */
async function captureTabWithRetry(tabId, attempts = 6, delayMs = 1000) {
  let result;
  for (let i = 0; i < attempts; i++) {
    result = await captureTab(tabId);
    if (result.ok) return result;
    await sleep(delayMs);
  }
  return result;
}

async function captureTab(tabId) {
  let response;
  try {
    response = await chrome.tabs.sendMessage(tabId, { type: "PERSONAMD_CAPTURE" });
  } catch (err) {
    // Most common cause: the content script isn't injected into this tab yet
    // (e.g. the tab was already open before the extension was loaded/reloaded).
    return {
      ok: false,
      error: "Couldn't reach this page. Reload the ChatGPT/Claude tab and try again.",
    };
  }

  if (!response?.ok) {
    return { ok: false, error: response?.error || "Capture failed." };
  }

  const stored = await getCaptures();
  const withId = { id: crypto.randomUUID(), ...response.conversation };
  await chrome.storage.local.set({ [STORAGE_KEY]: [withId, ...stored] });

  const pushResult = await pushToServer(withId);
  return { ok: true, conversation: withId, pushResult };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Navigates tabId to url and resolves once the tab finishes loading (or
 * after a safety timeout, so a slow/stuck load can't hang the whole batch). */
function navigateAndWait(tabId, url) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === "complete") finish();
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.update(tabId, { url }, () => {
      if (chrome.runtime.lastError) finish();
    });
    setTimeout(finish, 12000); // safety net if the load event never fires
  });
}

/** Walks the current tab through its own conversation list, capturing each
 * one. Runs in the background so it survives the popup closing; the popup
 * polls batchState via GET_BATCH_STATUS to show live progress. */
async function runBatchCapture(tabId) {
  if (batchState.running) {
    return { ok: false, error: "A batch is already running." };
  }

  let listResponse;
  try {
    listResponse = await chrome.tabs.sendMessage(tabId, { type: "PERSONAMD_LIST_CONVERSATIONS" });
  } catch {
    return { ok: false, error: "Couldn't reach this page. Reload the tab and try again." };
  }
  if (!listResponse?.ok) {
    return { ok: false, error: listResponse?.error || "Couldn't find a conversation list." };
  }

  const items = listResponse.conversations.slice(0, MAX_BATCH_SIZE);
  if (items.length === 0) {
    return { ok: false, error: "No conversations found in the sidebar." };
  }

  batchState = { running: true, total: items.length, done: 0, currentTitle: "", results: [] };

  // Runs asynchronously; the caller gets an immediate "started" response and
  // the popup watches batchState for progress instead of blocking on this.
  (async () => {
    for (const item of items) {
      batchState.currentTitle = item.title;
      try {
        await navigateAndWait(tabId, item.url);
        await sleep(600); // brief initial settle before the first read attempt
        const result = await captureTabWithRetry(tabId);
        batchState.results.push({ title: item.title, ok: result.ok, error: result.error });
      } catch (err) {
        batchState.results.push({ title: item.title, ok: false, error: String(err?.message || err) });
      }
      batchState.done += 1;
      await updateBadge();
    }
    batchState.running = false;
  })();

  return { ok: true, started: true, total: items.length };
}

async function getCaptures() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

async function updateBadge() {
  const captures = await getCaptures();
  chrome.action.setBadgeText({ text: captures.length > 0 ? String(captures.length) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#007AFF" });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "CAPTURE_ACTIVE_TAB") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          sendResponse({ ok: false, error: "No active tab." });
          return;
        }
        const result = await captureTab(tab.id);
        await updateBadge();
        sendResponse(result);
      } catch (err) {
        // Guarantees the popup always gets a response instead of hanging on
        // "Capturing…" forever if something above throws unexpectedly.
        sendResponse({ ok: false, error: "Unexpected error: " + (err?.message || String(err)) });
      }
    })();
    return true;
  }

  if (message?.type === "GET_CAPTURES") {
    getCaptures().then((captures) => sendResponse({ captures }));
    return true;
  }

  if (message?.type === "DELETE_CAPTURE") {
    (async () => {
      const captures = await getCaptures();
      const next = captures.filter((c) => c.id !== message.id);
      await chrome.storage.local.set({ [STORAGE_KEY]: next });
      await updateBadge();
      sendResponse({ captures: next });
    })();
    return true;
  }

  if (message?.type === "CLEAR_CAPTURES") {
    (async () => {
      await chrome.storage.local.set({ [STORAGE_KEY]: [] });
      await updateBadge();
      sendResponse({ captures: [] });
    })();
    return true;
  }

  if (message?.type === "CAPTURE_ALL_RECENT") {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        sendResponse({ ok: false, error: "No active tab." });
        return;
      }
      const result = await runBatchCapture(tab.id);
      sendResponse(result);
    })();
    return true;
  }

  if (message?.type === "GET_BATCH_STATUS") {
    sendResponse({ batchState });
    return true;
  }

  if (message?.type === "PERSONAMD_LIMIT_DETECTED" && message.conversation) {
    (async () => {
      const stored = await getCaptures();
      // Content script already extracted the conversation itself (it doesn't
      // go through captureTab), so assign the id and flag here.
      const withId = { id: crypto.randomUUID(), ...message.conversation, limitReached: true };
      await chrome.storage.local.set({ [STORAGE_KEY]: [withId, ...stored] });
      await updateBadge();
      await pushToServer(withId);
    })();
    // No response expected — the content script fires this and moves on.
    return false;
  }

  if (message?.type === "GET_SETTINGS") {
    getSettings().then((settings) => sendResponse({ settings }));
    return true;
  }

  if (message?.type === "SET_SETTINGS") {
    setSettings(message.patch).then((settings) => sendResponse({ settings }));
    return true;
  }
});

updateBadge();
