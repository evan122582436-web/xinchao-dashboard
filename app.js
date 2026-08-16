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
};

let sessionToken = '';
let refreshTimer = null;

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
  els.windows.textContent = runtime.activeWindows ?? runtime.windowCount ?? '--';
  els.updatedAt.textContent = formatTime(snapshot.generatedAt ?? runtime.lastHeartbeatAt);
  els.topCount.textContent = `${topDrives.length} 项`;

  renderDriveList(els.topDrives, topDrives);
  renderDriveList(els.allDrives, drives);
  renderCapabilities(snapshot.capabilities);
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

async function refreshSnapshot() {
  const snapshot = await fetchSnapshot();
  renderSnapshot(snapshot);
  setStatus('已连接', 'ok');
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
