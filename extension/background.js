/**
 * SentinelKey MV3 Background Service Worker
 * Coordinates background threat intelligence, interception messaging, and incident history.
 */

import { ExtensionSentinelKeyClient } from './sdk-client.js';

const DEFAULT_SETTINGS = {
  apiUrl: 'http://localhost:4000',
  token: '',
  failSafe: true,
  protectionActive: true,
};

let client = new ExtensionSentinelKeyClient({
  baseUrl: DEFAULT_SETTINGS.apiUrl,
  failSafe: DEFAULT_SETTINGS.failSafe,
});

let blockedCount = 0;

// Initialize settings from storage
async function initializeSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const data = await chrome.storage.local.get(['settings', 'incidents', 'blockedCount']);
    const settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    client.setBaseUrl(settings.apiUrl);
    client.setToken(settings.token);
    client.setFailSafe(settings.failSafe);
    blockedCount = data.blockedCount || 0;
    updateBadge();
  }
}

function updateBadge() {
  if (typeof chrome !== 'undefined' && chrome.action && chrome.action.setBadgeText) {
    if (blockedCount > 0) {
      chrome.action.setBadgeText({ text: String(blockedCount) });
      chrome.action.setBadgeBackgroundColor({ color: '#e11d48' }); // Rose red
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
}

async function recordIncident(incident) {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

  const data = await chrome.storage.local.get(['incidents', 'blockedCount']);
  const incidents = data.incidents || [];
  incidents.unshift({
    id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...incident,
    timestamp: new Date().toISOString(),
  });

  // Keep last 50 incidents
  const trimmed = incidents.slice(0, 50);
  blockedCount = (data.blockedCount || 0) + 1;

  await chrome.storage.local.set({
    incidents: trimmed,
    blockedCount,
  });

  updateBadge();
}

// Listen for messages from content scripts and popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      try {
        switch (message.type) {
          case 'CHECK_HEALTH': {
            const status = await client.health();
            sendResponse({ success: true, status });
            break;
          }

          case 'CHECK_URL': {
            const result = await client.classifyUrl(message.url, message.anchorText);
            if (result.verdict === 'blocked' || result.verdict === 'quarantined') {
              await recordIncident({
                type: 'url',
                target: message.url,
                verdict: result.verdict,
                score: result.score,
                rules: result.matchedRules?.map((r) => r.ruleId) || [],
                failSafe: !!result.metadata?.failSafeActive,
              });
            }
            sendResponse({ success: true, result });
            break;
          }

          case 'CHECK_FILE': {
            const result = await client.classifyFile(message.file);
            if (result.verdict === 'blocked' || result.verdict === 'quarantined') {
              await recordIncident({
                type: 'file',
                target: message.file.filename,
                verdict: result.verdict,
                score: result.score,
                rules: result.matchedRules?.map((r) => r.ruleId) || [],
                failSafe: !!result.metadata?.failSafeActive,
              });
            }
            sendResponse({ success: true, result });
            break;
          }

          case 'GET_SETTINGS': {
            const data = await chrome.storage.local.get(['settings']);
            sendResponse({ success: true, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) } });
            break;
          }

          case 'SAVE_SETTINGS': {
            const newSettings = { ...DEFAULT_SETTINGS, ...(message.settings || {}) };
            await chrome.storage.local.set({ settings: newSettings });
            client.setBaseUrl(newSettings.apiUrl);
            client.setToken(newSettings.token);
            client.setFailSafe(newSettings.failSafe);
            sendResponse({ success: true, settings: newSettings });
            break;
          }

          case 'GET_INCIDENTS': {
            const data = await chrome.storage.local.get(['incidents', 'blockedCount']);
            sendResponse({
              success: true,
              incidents: data.incidents || [],
              blockedCount: data.blockedCount || 0,
            });
            break;
          }

          case 'CLEAR_INCIDENTS': {
            blockedCount = 0;
            await chrome.storage.local.set({ incidents: [], blockedCount: 0 });
            updateBadge();
            sendResponse({ success: true });
            break;
          }

          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true; // Keep message channel open for async response
  });
}

// Lifecycle listeners
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    initializeSettings();
  });
}

initializeSettings();
