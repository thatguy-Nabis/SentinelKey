/**
 * SentinelKey Extension Popup Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation tabs
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panes.forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById(`tab-${target}`).classList.add('active');

      if (target === 'incidents') {
        loadIncidents();
      }
    });
  });

  // UI Elements
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const scanUrlInput = document.getElementById('scan-url-input');
  const scanUrlBtn = document.getElementById('scan-url-btn');
  const fileDropzone = document.getElementById('file-dropzone');
  const scanFileInput = document.getElementById('scan-file-input');
  const scanResult = document.getElementById('scan-result');
  const incidentsList = document.getElementById('incidents-list');
  const incidentCount = document.getElementById('incident-count');
  const clearIncidentsBtn = document.getElementById('clear-incidents-btn');
  const apiUrlInput = document.getElementById('api-url-input');
  const apiTokenInput = document.getElementById('api-token-input');
  const failsafeToggle = document.getElementById('failsafe-toggle');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const settingsStatus = document.getElementById('settings-status');

  // Check backend health
  async function checkHealth() {
    chrome.runtime.sendMessage({ type: 'CHECK_HEALTH' }, (response) => {
      if (response && response.success && response.status?.ok) {
        statusIndicator.className = 'status-indicator online';
        statusText.textContent = 'Protected';
      } else {
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'Fail-Safe Defense';
      }
    });
  }

  // Load stored settings
  async function loadSettings() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      if (response && response.success && response.settings) {
        apiUrlInput.value = response.settings.apiUrl || 'http://localhost:4000';
        apiTokenInput.value = response.settings.token || '';
        failsafeToggle.checked = response.settings.failSafe !== false;
      }
    });
  }

  // Load recent incidents
  async function loadIncidents() {
    chrome.runtime.sendMessage({ type: 'GET_INCIDENTS' }, (response) => {
      if (response && response.success) {
        const count = response.blockedCount || 0;
        incidentCount.textContent = String(count);

        const list = response.incidents || [];
        if (list.length === 0) {
          incidentsList.innerHTML = '<div class="empty-state">No security incidents detected.</div>';
          return;
        }

        incidentsList.innerHTML = list
          .map(
            (inc) => `
          <div class="incident-item">
            <div class="incident-target">${escapeHtml(inc.target)}</div>
            <div class="incident-meta">
              <strong>${inc.verdict.toUpperCase()}</strong> (Score: ${inc.score}/100) — ${inc.rules.join(', ') || 'Heuristics'}
              ${inc.failSafe ? ' • <span style="color:#f59e0b">Fail-Safe</span>' : ''}
            </div>
          </div>
        `
          )
          .join('');
      }
    });
  }

  // Save settings
  saveSettingsBtn.addEventListener('click', () => {
    const settings = {
      apiUrl: apiUrlInput.value.trim(),
      token: apiTokenInput.value.trim(),
      failSafe: failsafeToggle.checked,
    };

    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings }, (response) => {
      if (response && response.success) {
        settingsStatus.textContent = 'Settings saved successfully!';
        setTimeout(() => {
          settingsStatus.textContent = '';
        }, 2500);
        checkHealth();
      }
    });
  });

  // Clear incidents
  clearIncidentsBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_INCIDENTS' }, () => {
      incidentCount.textContent = '0';
      incidentsList.innerHTML = '<div class="empty-state">No security incidents detected.</div>';
    });
  });

  // Quick URL Scanner
  scanUrlBtn.addEventListener('click', async () => {
    const url = scanUrlInput.value.trim();
    if (!url) return;

    scanUrlBtn.disabled = true;
    scanUrlBtn.textContent = 'Scanning...';
    scanResult.classList.add('hidden');

    chrome.runtime.sendMessage({ type: 'CHECK_URL', url }, (response) => {
      scanUrlBtn.disabled = false;
      scanUrlBtn.textContent = 'Scan';

      if (response && response.success && response.result) {
        renderScanResult(response.result, url);
        loadIncidents();
      } else {
        renderErrorResult(response?.error || 'Scan request failed');
      }
    });
  });

  // Quick File Scanner
  fileDropzone.addEventListener('click', () => scanFileInput.click());

  scanFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    scanResult.classList.add('hidden');
    fileDropzone.querySelector('.dropzone-text span').textContent = `Scanning: ${file.name}...`;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const sha256 = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // base64 sample
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const len = Math.min(bytes.byteLength, 8192);
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const contentBase64 = btoa(binary);

      chrome.runtime.sendMessage(
        {
          type: 'CHECK_FILE',
          file: {
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            sha256,
            contentBase64,
          },
        },
        (response) => {
          fileDropzone.querySelector('.dropzone-text span').textContent = '📄 Click to choose or drag a file to scan';
          scanFileInput.value = '';

          if (response && response.success && response.result) {
            renderScanResult(response.result, file.name);
            loadIncidents();
          } else {
            renderErrorResult(response?.error || 'File scan request failed');
          }
        }
      );
    } catch (err) {
      fileDropzone.querySelector('.dropzone-text span').textContent = '📄 Click to choose or drag a file to scan';
      renderErrorResult(err.message);
    }
  });

  function renderScanResult(res, target) {
    scanResult.classList.remove('hidden');
    const badgeClass = res.verdict === 'safe' ? 'safe' : res.verdict === 'flagged' ? 'flagged' : 'blocked';
    const rulesList =
      res.matchedRules && res.matchedRules.length > 0
        ? res.matchedRules.map((r) => `<li><strong>${escapeHtml(r.ruleId || '')}</strong>: ${escapeHtml(r.name || r.description || '')}</li>`).join('')
        : '<li>No heuristic triggers detected.</li>';

    scanResult.innerHTML = `
      <div>
        <span class="result-badge ${badgeClass}">${res.verdict.toUpperCase()}</span>
        <span style="float:right; font-weight:700;">Score: ${res.score}/100</span>
      </div>
      <div style="font-family:monospace; margin: 4px 0 8px 0; word-break:break-all; color:#94a3b8;">${escapeHtml(target)}</div>
      <div style="font-size:11px; margin-bottom:4px;"><strong>Findings:</strong></div>
      <ul style="margin:0; padding-left:16px; font-size:11px; color:#cbd5e1;">${rulesList}</ul>
      ${res.metadata?.failSafeActive ? '<div style="margin-top:6px; font-size:10px; color:#fca5a5;">⚠️ Fail-Safe Defense Active (Backend offline)</div>' : ''}
    `;
  }

  function renderErrorResult(msg) {
    scanResult.classList.remove('hidden');
    scanResult.innerHTML = `
      <div style="color:#ef4444; font-weight:600;">Scan Failed</div>
      <div style="font-size:11px; color:#94a3b8; margin-top:4px;">${escapeHtml(msg)}</div>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Initialize
  checkHealth();
  loadSettings();
  loadIncidents();
});
