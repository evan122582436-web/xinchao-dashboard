const els = {
  baseUrl: document.querySelector('#base-url'),
  accessToken: document.querySelector('#access-token'),
  connectButton: document.querySelector('#connect-button'),
  refreshButton: document.querySelector('#refresh-button'),
  status: document.querySelector('#connection-status'),
  consciousness: document.querySelector('#consciousness'),
  fatigue: document.querySelector('#fatigue'),
  windows: document.querySelector('#windows'),
  updatedAt: document.querySelector('#updated-at'),
  topCount: document.querySelector('#top-count'),
  topDrives: document.querySelector('#top-drives'),
  allDrives: document.querySelector('#all-drives'),
  capabilityCount: document.querySelector('#capability-count'),
  capabilities: document.querySelector('#capabilities'),
  interactionButtons: document.querySelectorAll('.interaction-button'),
  interactionHistory: document.querySelector('#interaction-history'),
  autoWakeToggle: document.querySelector('#auto-wake-toggle'),
  autoWakeStatus: document.querySelector('#auto-wake-status'),
};

let sessionToken = '';
let refreshTimer = null;
let autoWakeInFlight = false;

const historyStorageKey = 'xinchao-dashboard-interaction-history';
const autoWakeStorageKey = 'xinchao-dashboard-auto-wake-enabled';
const autoWakeLastStorageKey = 'xinchao-dashboard-auto-wake-last-at';
const autoWakeCooldownMs = 10 * 60 * 1000;
const interactionLabels = {
  companionship: '陪他说句话',
  affection: '关心一下',
  intimacy: '贴贴',
  sharing: '分享',
  autoWake: '自动轻唤醒',
};

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/$/, '');
}

function setStatus(text, state = '') {
  els.status.textContent = text;
  els.status.className = `status-pill ${state}`.trim();
}

function formatNumber(value, digits = 3) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return value.toFixed(digits);
}

function formatTime(value) {
  if (!value) return new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '刚刚';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function readInteractionHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(historyStorageKey) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveInteractionHistory(history) {
  localStorage.setItem(historyStorageKey, JSON.stringify(history.slice(0, 5)));
}

function renderInteractionHistory() {
  const history = readInteractionHistory();
  els.interactionHistory.replaceChildren();

  if (history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = '还没有互动记录。';
    els.interactionHistory.append(empty);
    return;
  }

  history.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'history-row';

    const label = document.createElement('strong');
    label.textContent = item.label ?? interactionLabels[item.type] ?? item.type ?? '互动';

    const time = document.createElement('span');
    time.textContent = formatDateTime(item.at);

    row.append(label, time);
    els.interactionHistory.append(row);
  });
}

function recordInteraction(interactionType) {
  const history = readInteractionHistory();
  const label = interactionLabels[interactionType] ?? interactionType;
  history.unshift({
    type: interactionType,
    label,
    at: new Date().toISOString(),
  });
  saveInteractionHistory(history);
  renderInteractionHistory();
}

function isAutoWakeEnabled() {
  return localStorage.getItem(autoWakeStorageKey) === 'true';
}

function setAutoWakeEnabled(enabled) {
  localStorage.setItem(autoWakeStorageKey, String(enabled));
  renderAutoWake();
}

function getAutoWakeLastAt() {
  const value = Number(localStorage.getItem(autoWakeLastStorageKey) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function setAutoWakeLastAt(value) {
  localStorage.setItem(autoWakeLastStorageKey, String(value));
}

function renderAutoWake() {
  const enabled = isAutoWakeEnabled();
  els.autoWakeToggle.textContent = `自动轻唤醒：${enabled ? '开' : '关'}`;
  els.autoWakeToggle.setAttribute('aria-pressed', String(enabled));
  els.autoWakeToggle.classList.toggle('active', enabled);

  const lastAt = getAutoWakeLastAt();
  els.autoWakeStatus.textContent = lastAt
    ? `上次自动唤醒：${formatDateTime(lastAt)}`
    : '只在本浏览器生效';
}

function percentOf(drive) {
  if (typeof drive.percent === 'number') return Math.max(0, Math.min(100, drive.percent));
  if (typeof drive.value === 'number') return Math.max(0, Math.min(100, drive.value * 100));
  return 0;
}

function renderDriveList(container, drives) {
  container.replaceChildren();

  if (!Array.isArray(drives) || drives.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = '还没有读到驱力数据。';
    container.append(empty);
    return;
  }

  drives.forEach((drive) => {
    const row = document.createElement('div');
    row.className = 'drive-row';

    const meta = document.createElement('div');
    meta.className = 'drive-meta';

    const label = document.createElement('strong');
    label.textContent = drive.label ?? drive.key ?? '未知维度';

    const value = document.createElement('span');
    value.textContent = formatNumber(drive.value ?? drive.percent / 100);

    const bar = document.createElement('div');
    bar.className = 'bar';

    const fill = document.createElement('span');
    fill.style.setProperty('--value', `${percentOf(drive)}%`);

    meta.append(label, value);
    bar.append(fill);
    row.append(meta, bar);
    container.append(row);
  });
}

function renderCapabilities(capabilities) {
  els.capabilities.replaceChildren();
  const entries = Object.entries(capabilities ?? {});
  els.capabilityCount.textContent = `${entries.length} 项`;

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = '暂无能力清单。';
    els.capabilities.append(empty);
    return;
  }

  entries.forEach(([key, value]) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `${key}: ${value ? 'on' : 'off'}`;
    els.capabilities.append(chip);
  });
}

function renderSnapshot(snapshot) {
  const runtime = snapshot.runtime ?? {};
  const topDrives = snapshot.topDrives ?? [];
  const drives = snapshot.drives ?? [];

  els.consciousness.textContent = runtime.consciousness ?? snapshot.consciousness ?? '--';
  els.fatigue.textContent = formatNumber(runtime.fatigue ?? snapshot.fatigue);
  els.windows.textContent = formatWindowValue(snapshot);
  els.updatedAt.textContent = formatTime(snapshot.generatedAt ?? runtime.lastHeartbeatAt);
  els.topCount.textContent = `${topDrives.length} 项`;

  renderDriveList(els.topDrives, topDrives);
  renderDriveList(els.allDrives, drives);
  renderCapabilities(snapshot.capabilities);
}

function getConsciousness(snapshot) {
  return snapshot.runtime?.consciousness ?? snapshot.consciousness ?? '';
}

function normalizeConsciousness(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isSleeping(value) {
  return ['sleep', 'sleeping', 'asleep'].includes(normalizeConsciousness(value));
}

function formatWindowValue(snapshot) {
  const runtime = snapshot.runtime ?? {};
  const explicitCount = runtime.activeWindows ?? runtime.windowCount ?? snapshot.activeWindows ?? snapshot.windowCount;

  if (typeof explicitCount === 'number') return String(explicitCount);
  if (typeof explicitCount === 'string' && explicitCount.trim()) return explicitCount;

  const sessionId =
    runtime.sessionId ??
    runtime.session_id ??
    snapshot.sessionId ??
    snapshot.session_id ??
    snapshot.session?.id ??
    snapshot.session?.sessionId;

  return sessionId ? '1 个' : '未上报';
}

async function startSession() {
  const baseUrl = normalizeBaseUrl(els.baseUrl.value);
  const accessToken = els.accessToken.value.trim();

  if (!baseUrl || !accessToken) {
    throw new Error('请先填写心潮地址和 Dashboard Token。');
  }

  const response = await fetch(`${baseUrl}/dashboard/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, mode: 'header' }),
  });

  if (!response.ok) {
    throw new Error(`Dashboard 登录失败：HTTP ${response.status}`);
  }

  const data = await response.json();
  sessionToken = data.token ?? data.session_token ?? data.access_token ?? '';

  if (!sessionToken) {
    throw new Error('登录成功但没有拿到短期 session token，请检查 Dashboard 跨源配置。');
  }
}

async function fetchSnapshot() {
  const baseUrl = normalizeBaseUrl(els.baseUrl.value);
  const response = await fetch(`${baseUrl}/dashboard/api/snapshot`, {
    headers: { authorization: `Bearer ${sessionToken}` },
  });

  if (!response.ok) {
    throw new Error(`Snapshot 读取失败：HTTP ${response.status}`);
  }

  return response.json();
}

async function sendInteraction(interactionType) {
  if (!sessionToken) {
    throw new Error('请先连接面板。');
  }

  const baseUrl = normalizeBaseUrl(els.baseUrl.value);
  const eventId = `dashboard-${interactionType}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await fetch(`${baseUrl}/dashboard/api/interactions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${sessionToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      event_id: eventId,
      interaction_type: interactionType,
    }),
  });

  if (!response.ok) {
    throw new Error(`互动提交失败：HTTP ${response.status}`);
  }

  await response.json();
}

async function maybeAutoWake(snapshot) {
  if (!isAutoWakeEnabled() || autoWakeInFlight || !sessionToken) return;
  if (!isSleeping(getConsciousness(snapshot))) return;

  const now = Date.now();
  const lastAt = getAutoWakeLastAt();
  if (now - lastAt < autoWakeCooldownMs) return;

  autoWakeInFlight = true;
  try {
    setStatus('自动轻唤醒中');
    await sendInteraction('companionship');
    setAutoWakeLastAt(now);
    recordInteraction('autoWake');
    renderAutoWake();
    setStatus('自动轻唤醒已写入', 'ok');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    autoWakeInFlight = false;
  }
}

async function refreshSnapshot() {
  const snapshot = await fetchSnapshot();
  renderSnapshot(snapshot);
  setStatus('已连接', 'ok');
  await maybeAutoWake(snapshot);
}

async function connect() {
  try {
    setStatus('连接中');
    els.connectButton.disabled = true;
    await startSession();
    await refreshSnapshot();
    els.refreshButton.disabled = false;
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      refreshSnapshot().catch((error) => setStatus(error.message, 'error'));
    }, 8000);
  } catch (error) {
    setStatus(error.message, 'error');
    els.connectButton.disabled = false;
  }
}

els.connectButton.addEventListener('click', connect);
els.refreshButton.addEventListener('click', () => {
  refreshSnapshot().catch((error) => setStatus(error.message, 'error'));
});

els.autoWakeToggle.addEventListener('click', () => {
  setAutoWakeEnabled(!isAutoWakeEnabled());
});

els.interactionButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      button.disabled = true;
      setStatus('正在提交互动');
      await sendInteraction(button.dataset.type);
      recordInteraction(button.dataset.type);
      await refreshSnapshot();
      setStatus('互动已写入', 'ok');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });
});

renderInteractionHistory();
renderAutoWake();
