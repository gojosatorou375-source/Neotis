const listEl = document.getElementById("list");
const statusEl = document.getElementById("status");
const autoPushEl = document.getElementById("autoPush");
const baseUrlEl = document.getElementById("baseUrl");
const accessKeyEl = document.getElementById("accessKey");
const captureAllEl = document.getElementById("captureAll");
const progressTrackEl = document.getElementById("progressTrack");
const progressFillEl = document.getElementById("progressFill");
let pollHandle = null;

const PROVIDER_COLORS = {
  chatgpt: "#10a37f",
  claude: "#d97757",
  gemini: "#4285f4",
  grok: "#8b5cf6",
  perplexity: "#20808d",
  other: "#9a9a9e",
};

function providerColor(provider) {
  return PROVIDER_COLORS[provider] || PROVIDER_COLORS.other;
}

function send(message) {
  return new Promise((resolve) => {
    // Safety net: if the background worker never calls sendResponse for some
    // unforeseen reason, don't leave the UI stuck on "Capturing…" forever.
    const timeout = setTimeout(
      () => resolve({ ok: false, error: "Timed out waiting for a response. Try again." }),
      8000
    );
    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response);
    });
  });
}

function render(captures) {
  listEl.innerHTML = "";
  if (captures.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No conversations captured yet.";
    listEl.style.display = "block";
    listEl.appendChild(li);
    return;
  }

  for (const c of captures) {
    const li = document.createElement("li");
    li.className = "capture-row";
    const meta = document.createElement("span");
    meta.className = "meta";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = providerColor(c.provider);
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = `${c.title} · ${c.messages.length} msgs`;
    meta.appendChild(dot);
    meta.appendChild(label);
    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "Remove";
    del.onclick = async () => {
      const { captures: next } = await send({ type: "DELETE_CAPTURE", id: c.id });
      render(next);
    };
    li.appendChild(meta);
    li.appendChild(del);
    listEl.appendChild(li);
  }
}

async function refresh() {
  const { captures } = await send({ type: "GET_CAPTURES" });
  render(captures || []);
}

document.getElementById("capture").addEventListener("click", async () => {
  statusEl.textContent = "Capturing…";
  const result = await send({ type: "CAPTURE_ACTIVE_TAB" });
  if (result?.ok) {
    const push = result.pushResult;
    const pushNote = push?.pushed
      ? " Sent to Noetis."
      : push?.reason === "disabled"
        ? ""
        : ` (Couldn't reach Noetis: ${push?.reason || "unknown error"}.)`;
    statusEl.textContent = `Captured "${result.conversation.title}".${pushNote}`;
    refresh();
  } else {
    statusEl.textContent = result?.error || "Couldn't capture this tab.";
  }
});

captureAllEl.addEventListener("click", async () => {
  statusEl.textContent = "Reading conversation list…";
  captureAllEl.disabled = true;
  const result = await send({ type: "CAPTURE_ALL_RECENT" });
  if (!result?.ok) {
    statusEl.textContent = result?.error || "Couldn't start batch capture.";
    captureAllEl.disabled = false;
    return;
  }
  progressTrackEl.style.display = "block";
  pollBatchStatus();
});

function pollBatchStatus() {
  if (pollHandle) clearInterval(pollHandle);
  pollHandle = setInterval(async () => {
    const { batchState } = await send({ type: "GET_BATCH_STATUS" });
    if (!batchState) return;

    const pct = batchState.total > 0 ? Math.round((batchState.done / batchState.total) * 100) : 0;
    progressFillEl.style.width = `${pct}%`;

    if (batchState.running) {
      statusEl.textContent = `Capturing ${batchState.done + 1} of ${batchState.total}: "${batchState.currentTitle}"…`;
    } else {
      clearInterval(pollHandle);
      pollHandle = null;
      captureAllEl.disabled = false;
      progressTrackEl.style.display = "none";
      const okCount = batchState.results.filter((r) => r.ok).length;
      const failCount = batchState.results.length - okCount;
      statusEl.textContent = `Captured ${okCount} conversation(s)${failCount > 0 ? `, ${failCount} failed` : ""}.`;
      refresh();
    }
  }, 700);
}

async function loadSettings() {
  const { settings } = await send({ type: "GET_SETTINGS" });
  autoPushEl.checked = !!settings.autoPush;
  baseUrlEl.value = settings.baseUrl;
  accessKeyEl.value = settings.accessKey || "";
}

autoPushEl.addEventListener("change", () => {
  send({ type: "SET_SETTINGS", patch: { autoPush: autoPushEl.checked } });
});

baseUrlEl.addEventListener("change", () => {
  send({ type: "SET_SETTINGS", patch: { baseUrl: baseUrlEl.value.trim() || "https://noetis.vercel.app" } });
});

accessKeyEl.addEventListener("change", () => {
  send({ type: "SET_SETTINGS", patch: { accessKey: accessKeyEl.value.trim() } });
});

loadSettings();

document.getElementById("download").addEventListener("click", async () => {
  const { captures } = await send({ type: "GET_CAPTURES" });
  if (!captures || captures.length === 0) {
    statusEl.textContent = "Nothing to download yet.";
    return;
  }
  const capsule = {
    version: 1,
    exportedAt: new Date().toISOString(),
    conversations: captures,
  };
  const blob = new Blob([JSON.stringify(capsule, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `noetis-capsule-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  statusEl.textContent = `Downloaded ${captures.length} conversation(s).`;
});

document.getElementById("clear").addEventListener("click", async () => {
  if (!confirm("Clear all captured conversations from this browser?")) return;
  const { captures } = await send({ type: "CLEAR_CAPTURES" });
  render(captures || []);
  statusEl.textContent = "Cleared.";
});

refresh();

// If a batch was already running when the popup was reopened, resume showing it.
send({ type: "GET_BATCH_STATUS" }).then(({ batchState }) => {
  if (batchState?.running) {
    captureAllEl.disabled = true;
    progressTrackEl.style.display = "block";
    pollBatchStatus();
  }
});
