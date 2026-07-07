const listEl = document.getElementById("list");
const statusEl = document.getElementById("status");
const autoPushEl = document.getElementById("autoPush");
const baseUrlEl = document.getElementById("baseUrl");
const accessKeyEl = document.getElementById("accessKey");
const captureAllEl = document.getElementById("captureAll");
const progressTrackEl = document.getElementById("progressTrack");
const progressFillEl = document.getElementById("progressFill");
const badgeDevEl = document.getElementById("badgeDev");
const connectionBadgeEl = document.getElementById("connectionBadge");
const connectionTextEl = document.getElementById("connectionText");

const toggleKeyBtn = document.getElementById("toggleKey");
const copyKeyBtn = document.getElementById("copyKey");
const resetKeyBtn = document.getElementById("resetKey");

let pollHandle = null;

const PROVIDER_INFO = {
  chatgpt: { label: "GPT", color: "#10a37f" },
  claude: { label: "CLD", color: "#d97757" },
  gemini: { label: "GEM", color: "#4285f4" },
  grok: { label: "GRK", color: "#000000" },
  perplexity: { label: "PPL", color: "#20808d" },
  deepseek: { label: "DSK", color: "#4d6bfe" },
  other: { label: "AI", color: "#9a9a9e" },
};

function getProviderDetails(provider) {
  return PROVIDER_INFO[provider] || PROVIDER_INFO.other;
}

function send(message) {
  return new Promise((resolve) => {
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
    listEl.appendChild(li);
    return;
  }

  for (const c of captures) {
    const li = document.createElement("li");
    li.className = "capture-row";

    const meta = document.createElement("span");
    meta.className = "meta";

    const details = getProviderDetails(c.provider);
    const badge = document.createElement("span");
    badge.className = "provider-badge";
    badge.style.background = details.color;
    badge.textContent = details.label;

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = `${c.title} · ${c.messages.length} msgs`;

    meta.appendChild(badge);
    meta.appendChild(label);

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.title = "Remove capture";
    del.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;
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

// Check connection status
async function checkConnection(baseUrl, accessKey) {
  if (!baseUrl) {
    updateConnectionBadge(false);
    return;
  }

  // First, try to get a session token (this will also validate the access key)
  try {
    const sessionRes = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessKey }),
    });
    if (!sessionRes.ok) {
      updateConnectionBadge(false);
      return;
    }
    const { sessionToken } = await sessionRes.json();
    // Then, use the session token to check connection
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/skills`, {
      method: "GET",
      headers: {
        ...(sessionToken ? { "X-PersonaMD-Session": sessionToken } : {}),
      },
    });
    updateConnectionBadge(res.ok);
  } catch (err) {
    updateConnectionBadge(false);
  }
}

function updateConnectionBadge(isConnected) {
  if (isConnected) {
    connectionBadgeEl.className = "connection-badge connected";
    connectionTextEl.textContent = "Connected";
  } else {
    connectionBadgeEl.className = "connection-badge";
    connectionTextEl.textContent = "Offline";
  }
}

function checkDevBadge(url) {
  if (url && (url.includes("localhost") || url.includes("127.0.0.1"))) {
    badgeDevEl.style.display = "inline";
  } else {
    badgeDevEl.style.display = "none";
  }
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

const activeSkillEl = document.getElementById("activeSkill");

async function loadSkillsList(baseUrl, accessKey, currentActiveId) {
  if (!baseUrl) return;
  try {
    // First, get a session token
    const sessionRes = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessKey }),
    });
    if (!sessionRes.ok) throw new Error();
    const { sessionToken } = await sessionRes.json();
    // Then, use the session token to load skills
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/skills`, {
      method: "GET",
      headers: {
        ...(sessionToken ? { "X-PersonaMD-Session": sessionToken } : {}),
      },
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (data && Array.isArray(data.skills)) {
      activeSkillEl.innerHTML = '<option value="">All Skills (Concatenated)</option>';
      data.skills.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.projectName} (${s.name})`;
        if (s.id === currentActiveId) {
          opt.selected = true;
        }
        activeSkillEl.appendChild(opt);
      });
    }
  } catch (err) {
    // Graceful silent fail for skills dropdown
  }
}

async function loadSettings() {
  const { settings } = await send({ type: "GET_SETTINGS" });
  autoPushEl.checked = !!settings.autoPush;
  baseUrlEl.value = settings.baseUrl;
  accessKeyEl.value = settings.accessKey || "";
  checkDevBadge(settings.baseUrl);
  await checkConnection(settings.baseUrl, settings.accessKey);
  await loadSkillsList(settings.baseUrl, settings.accessKey, settings.activeSkillId);
}

autoPushEl.addEventListener("change", () => {
  send({ type: "SET_SETTINGS", patch: { autoPush: autoPushEl.checked } });
});

baseUrlEl.addEventListener("change", async () => {
  const newUrl = baseUrlEl.value.trim() || "https://noetis.vercel.app";
  checkDevBadge(newUrl);
  const { settings } = await send({ type: "SET_SETTINGS", patch: { baseUrl: newUrl } });
  await checkConnection(settings.baseUrl, settings.accessKey);
  await loadSkillsList(settings.baseUrl, settings.accessKey, settings.activeSkillId);
});

accessKeyEl.addEventListener("change", async () => {
  const newKey = accessKeyEl.value.trim();
  const { settings } = await send({ type: "SET_SETTINGS", patch: { accessKey: newKey } });
  await checkConnection(settings.baseUrl, settings.accessKey);
  await loadSkillsList(settings.baseUrl, settings.accessKey, settings.activeSkillId);
});

activeSkillEl.addEventListener("change", () => {
  send({ type: "SET_SETTINGS", patch: { activeSkillId: activeSkillEl.value } });
});

// Toggle access key visibility
toggleKeyBtn.addEventListener("click", () => {
  if (accessKeyEl.type === "password") {
    accessKeyEl.type = "text";
    toggleKeyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    `;
  } else {
    accessKeyEl.type = "password";
    toggleKeyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
  }
});

// Copy access key to clipboard
copyKeyBtn.addEventListener("click", () => {
  const key = accessKeyEl.value;
  if (!key) return;
  navigator.clipboard.writeText(key).then(() => {
    const originalText = statusEl.textContent;
    statusEl.textContent = "Access key copied to clipboard!";
    setTimeout(() => {
      statusEl.textContent = originalText;
    }, 2000);
  });
});

// Reset / Clear access key
resetKeyBtn.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to clear/reset the access key?")) return;
  accessKeyEl.value = "";
  const { settings } = await send({ type: "SET_SETTINGS", patch: { accessKey: "" } });
  statusEl.textContent = "Access key reset successfully.";
  await checkConnection(settings.baseUrl, "");
  await loadSkillsList(settings.baseUrl, "", settings.activeSkillId);
});

// Reset floating button position for the current tab's hostname
const resetPositionBtn = document.getElementById("resetPosition");
if (resetPositionBtn) {
  resetPositionBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.id) {
        statusEl.textContent = "No active tab found.";
        return;
      }
      // Derive the storage key the content script uses
      let hostname = "";
      try { hostname = new URL(tab.url).hostname; } catch { /* non-tab URL */ }
      if (!hostname) {
        statusEl.textContent = "Can't determine page hostname.";
        return;
      }
      const posKey = "buttonPosition:" + hostname;
      chrome.storage.local.remove([posKey], () => {
        // Also tell the live content script to reset immediately (if loaded)
        chrome.tabs.sendMessage(tab.id, { type: "PERSONAMD_RESET_POSITION" }, () => {
          // Ignore lastError — if the script isn't injected the storage clear
          // alone is enough (button re-docks on next page load).
          void chrome.runtime.lastError;
        });
        statusEl.textContent = `Button position reset for ${hostname}.`;
      });
    });
  });
}

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

send({ type: "GET_BATCH_STATUS" }).then(({ batchState }) => {
  if (batchState?.running) {
    captureAllEl.disabled = true;
    progressTrackEl.style.display = "block";
    pollBatchStatus();
  }
});
