/**
 * SentinelKey MV3 Content Script
 * Intercepts outbound link clicks and file upload inputs in real-time.
 */

(() => {
  // Prevent duplicate injections
  if (window.__sentinelKeyContentScriptLoaded) return;
  window.__sentinelKeyContentScriptLoaded = true;

  // In-memory set of user-overridden URLs for current session
  const approvedUrls = new Set();

  // Helper: compute SHA-256 digest of file buffer
  async function computeSha256(arrayBuffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Helper: arrayBuffer to base64 string
  function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = Math.min(bytes.byteLength, 8192); // sample first 8KB
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Helper: escape HTML to prevent XSS from attacker-controlled URLs/filenames
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }

  // Helper: show threat modal UI
  function showThreatModal({ title, target, verdict, score, rules, onBypass, onCancel }) {
    // Remove any existing modal
    const existing = document.getElementById('sentinelkey-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'sentinelkey-modal-overlay';

    const rulesHtml = rules && rules.length > 0
      ? `<ul class="sk-rules-list">${rules.map((r) => `<li><strong>${escapeHtml(r.ruleId || r.name)}</strong>: ${escapeHtml(r.description || r.score + ' pts')}</li>`).join('')}</ul>`
      : '<p>Threat classified by SentinelKey heuristics engine.</p>';

    const logoUrl = typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/logo.png') : '';

    overlay.innerHTML = `
      <div id="sentinelkey-modal-card">
        <div class="sk-header">
          ${logoUrl ? `<img class="sk-shield-logo" src="${logoUrl}" alt="SentinelKey" />` : '<div class="sk-shield-icon">⚠️</div>'}
          <div class="sk-title-box">
            <h3>SentinelKey Threat Defense</h3>
            <p>${escapeHtml(title || 'High-Risk Action Blocked')}</p>
          </div>
        </div>

        <div class="sk-verdict-banner">
          <span class="sk-verdict-badge">${escapeHtml(verdict.toUpperCase())} (Score: ${score}/100)</span>
          <div class="sk-target-url">${escapeHtml(target)}</div>
        </div>

        <div class="sk-details-box">
          <strong>Security Intelligence Findings:</strong>
          ${rulesHtml}
        </div>

        <div class="sk-actions">
          <button id="sk-bypass-btn" class="sk-btn sk-btn-secondary">Proceed Anyway (Override)</button>
          <button id="sk-safe-btn" class="sk-btn sk-btn-primary">Return to Safety</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('sk-safe-btn').addEventListener('click', () => {
      overlay.remove();
      if (onCancel) onCancel();
    });

    document.getElementById('sk-bypass-btn').addEventListener('click', () => {
      overlay.remove();
      if (onBypass) onBypass();
    });
  }

  // ==========================================
  // Intercept Link Clicks
  // ==========================================
  document.addEventListener('click', async (event) => {
    const anchor = event.target.closest('a');
    if (!anchor || !anchor.href) return;

    const href = anchor.href;

    // Ignore javascript: or anchor jumps or same-page hashes
    if (href.startsWith('javascript:') || href.startsWith('#') || href.startsWith('mailto:')) {
      return;
    }

    try {
      const urlObj = new URL(href);
      // Skip same host navigation unless it has suspicious query parameters
      if (urlObj.hostname === window.location.hostname) {
        return;
      }

      if (approvedUrls.has(href)) {
        return; // User explicitly bypassed
      }

      // Intercept and scan
      event.preventDefault();
      event.stopPropagation();

      const anchorText = anchor.textContent?.trim() || anchor.title || href;

      chrome.runtime.sendMessage(
        {
          type: 'CHECK_URL',
          url: href,
          anchorText,
        },
        (response) => {
          if (!response || !response.success || !response.result) {
            // If background script failed, fail closed or warn
            showThreatModal({
              title: 'Backend Unreachable (Fail-Safe Defense)',
              target: href,
              verdict: 'BLOCKED',
              score: 100,
              rules: [{ ruleId: 'FAIL-SAFE-001', description: 'SentinelKey extension could not verify URL.' }],
              onBypass: () => {
                approvedUrls.add(href);
                window.location.href = href;
              },
            });
            return;
          }

          const result = response.result;
          if (result.verdict === 'blocked' || result.verdict === 'quarantined') {
            showThreatModal({
              title: 'Malicious or Phishing Link Blocked',
              target: href,
              verdict: result.verdict,
              score: result.score,
              rules: result.matchedRules,
              onBypass: () => {
                approvedUrls.add(href);
                window.location.href = href;
              },
            });
          } else {
            // URL is verified safe
            window.location.href = href;
          }
        }
      );
    } catch {
      // Ignore invalid URLs
    }
  }, true);

  // ==========================================
  // Intercept File Upload Selections
  // ==========================================
  document.addEventListener('change', async (event) => {
    const input = event.target;
    if (!input || input.type !== 'file' || !input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const filename = file.name;
    const mimeType = file.type || 'application/octet-stream';
    const sizeBytes = file.size;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const sha256 = await computeSha256(arrayBuffer);
      const contentBase64 = bufferToBase64(arrayBuffer);

      chrome.runtime.sendMessage(
        {
          type: 'CHECK_FILE',
          file: {
            filename,
            mimeType,
            sizeBytes,
            sha256,
            contentBase64,
          },
        },
        (response) => {
          if (!response || !response.success || !response.result) {
            // Fail-safe block
            input.value = '';
            showThreatModal({
              title: 'File Upload Blocked (Fail-Safe Defense)',
              target: filename,
              verdict: 'BLOCKED',
              score: 100,
              rules: [{ ruleId: 'FAIL-SAFE-001', description: 'SentinelKey could not verify file safety.' }],
            });
            return;
          }

          const result = response.result;
          if (result.verdict === 'blocked' || result.verdict === 'quarantined') {
            input.value = ''; // Prevent upload
            showThreatModal({
              title: 'Dangerous File Upload Blocked',
              target: `${filename} (${Math.round(sizeBytes / 1024)} KB)`,
              verdict: result.verdict,
              score: result.score,
              rules: result.matchedRules,
            });
          }
        }
      );
    } catch (err) {
      console.warn('[SentinelKey] File inspection failed:', err);
    }
  }, true);
})();
