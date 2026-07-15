/**
 * Chrome Storage Local, IndexedDB & API wrappers for PromptIQ
 */

const DB_NAME = 'PromptIQ_DB';
const STORE_NAME = 'history';
const DB_VERSION = 1;
const API_BASE = 'https://promptiq-theta.vercel.app';
const REQUEST_TIMEOUT_MS = 15000;
const MAX_LOCAL_HISTORY = 200;
const MAX_FAVORITE_PROMPTS = 100;
const FAVORITES_KEY = 'favoritePrompts';

export function normalizeTier(tier) {
  return tier === 'premium' || tier === 'pro' ? 'premium' : 'free';
}

async function requestJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.code = data.code || '';
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('The server took too long to respond. Please try again.');
      timeoutError.code = 'REQUEST_TIMEOUT';
      throw timeoutError;
    }
    if (error instanceof TypeError) {
      const networkError = new Error('Unable to reach PromptIQ. Check your connection and try again.');
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (e) => reject(e.target.error);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getLocalHistory() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
    };
    request.onerror = (event) => reject(event.target.error);
  });
}

async function trimLocalHistory(db) {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  await new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const staleRecords = request.result
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(MAX_LOCAL_HISTORY);
      staleRecords.forEach((record) => store.delete(record.id));
    };
    tx.oncomplete = resolve;
    tx.onerror = (event) => reject(event.target.error);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Session Token Management
export function getSessionToken() {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('sessionToken', (data) => {
          resolve(data.sessionToken || null);
        });
        return;
      }
    } catch (e) {
      // Context invalidated
    }
    resolve(localStorage.getItem('sessionToken') || null);
  });
}

export function setSessionToken(token) {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ sessionToken: token }, () => resolve());
        return;
      }
    } catch (e) {
      // Context invalidated
    }
    localStorage.setItem('sessionToken', token);
    resolve();
  });
}

export function clearSessionToken() {
  return new Promise((resolve) => {
    const keys = ['sessionToken', 'userTier', 'userEmail'];
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(keys, () => resolve());
        return;
      }
    } catch (e) {
      // Context invalidated
    }
    keys.forEach(k => localStorage.removeItem(k));
    resolve();
  });
}

function getExtensionStorageValue(key, fallbackValue) {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(key, (data) => {
          resolve(data[key] ?? fallbackValue);
        });
        return;
      }
    } catch (e) {
      // Context invalidated
    }

    try {
      const raw = localStorage.getItem(key);
      resolve(raw ? JSON.parse(raw) : fallbackValue);
    } catch (e) {
      resolve(fallbackValue);
    }
  });
}

function setExtensionStorageValue(key, value) {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [key]: value }, () => resolve());
        return;
      }
    } catch (e) {
      // Context invalidated
    }

    localStorage.setItem(key, JSON.stringify(value));
    resolve();
  });
}

function createFavoriteKey(original, optimized, platform) {
  const source = `${platform || 'general'}::${original || ''}::${optimized || ''}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  return `fav_${Math.abs(hash).toString(36)}`;
}

function normalizeFavoriteRecord(record) {
  const original = String(record.original || '');
  const optimized = String(record.optimized || '');
  const platform = String(record.platform || 'general');

  return {
    id: record.id || createFavoriteKey(original, optimized, platform),
    original,
    optimized,
    platform,
    intent: record.intent || null,
    mode: record.mode || 'standard',
    scoreOriginal: Number.isFinite(record.scoreOriginal) ? record.scoreOriginal : null,
    scoreOptimized: Number.isFinite(record.scoreOptimized) ? record.scoreOptimized : null,
    timestamp: Number.isFinite(record.timestamp) ? record.timestamp : Date.now()
  };
}

export async function getFavoritePrompts() {
  const favorites = await getExtensionStorageValue(FAVORITES_KEY, []);
  return Array.isArray(favorites)
    ? favorites.map(normalizeFavoriteRecord).sort((a, b) => b.timestamp - a.timestamp)
    : [];
}

export async function isFavoritePrompt(record) {
  const normalized = normalizeFavoriteRecord(record);
  const favorites = await getFavoritePrompts();
  return favorites.some((favorite) => favorite.id === normalized.id);
}

export async function toggleFavoritePrompt(record) {
  const normalized = normalizeFavoriteRecord(record);
  const favorites = await getFavoritePrompts();
  const exists = favorites.some((favorite) => favorite.id === normalized.id);
  const nextFavorites = exists
    ? favorites.filter((favorite) => favorite.id !== normalized.id)
    : [normalized, ...favorites].slice(0, MAX_FAVORITE_PROMPTS);

  await setExtensionStorageValue(FAVORITES_KEY, nextFavorites);
  return {
    favorite: !exists,
    favorites: nextFavorites
  };
}

// Auth Actions
export async function signupUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Enter a valid email address.');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const data = await requestJson('/api/auth?action=signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalizedEmail, password })
  });

  await setSessionToken(data.token);
  await setUserTier(normalizeTier(data.user.plan));
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ userEmail: data.user.email });
  } else {
    localStorage.setItem('userEmail', data.user.email);
  }
  return data;
}

export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required.');
  }

  const data = await requestJson('/api/auth?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalizedEmail, password })
  });

  await setSessionToken(data.token);
  await setUserTier(normalizeTier(data.user.plan));
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ userEmail: data.user.email });
  } else {
    localStorage.setItem('userEmail', data.user.email);
  }
  return data;
}

export async function fetchUserProfile() {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const data = await requestJson('/api/auth?action=me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    data.user.plan = normalizeTier(data.user.plan);
    await setUserTier(data.user.plan);
    return data.user;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      await clearSessionToken();
      return null;
    }
    throw error;
  }
}

// Subscription Actions
export async function checkoutSubscription() {
  const token = await getSessionToken();
  if (!token) throw new Error('You must be logged in to subscribe.');

  const data = await requestJson('/api/subscription/checkout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return data.url;
}

// IndexedDB Actions (Synchronized via JWT Authorization)
export async function saveOptimization(original, optimized, scoreDelta, platform, intent = null, mode = null, scoreOriginal = null, scoreOptimized = null) {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const addRequest = store.add({
      original,
      optimized,
      scoreDelta,
      platform,
      intent,
      mode,
      scoreOriginal,
      scoreOptimized,
      timestamp: Date.now()
    });

    const localId = await new Promise((resolve, reject) => {
      addRequest.onsuccess = () => resolve(addRequest.result);
      addRequest.onerror = (event) => reject(event.target.error);
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = (event) => reject(event.target.error);
    });
    await trimLocalHistory(db);

    const token = await getSessionToken();
    if (token) {
      const data = await requestJson('/api/history', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          original,
          optimized,
          scoreDelta,
          platform,
          intent,
          mode,
          scoreOriginal,
          scoreOptimized
        })
      });

      const remoteId = data.data?.id || null;
      if (remoteId !== null) {
        const updateTx = db.transaction(STORE_NAME, 'readwrite');
        const updateStore = updateTx.objectStore(STORE_NAME);
        const getRequest = updateStore.get(localId);
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            updateStore.put({ ...getRequest.result, serverId: remoteId });
          }
        };
        await new Promise((resolve, reject) => {
          updateTx.oncomplete = resolve;
          updateTx.onerror = (event) => reject(event.target.error);
        });
      }
      return remoteId;
    }
  } catch (err) {
    console.error('Failed to save history:', err);
  }
  return null;
}

export async function getHistory() {
  try {
    const localHistory = await getLocalHistory();
    const token = await getSessionToken();
    if (token) {
      try {
        const serverHistory = await requestJson('/api/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const serverIds = new Set(serverHistory.map((item) => String(item.id)));
        const unsyncedLocal = localHistory.filter((item) => {
          return !item.serverId || !serverIds.has(String(item.serverId));
        });

        return [...serverHistory, ...unsyncedLocal]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_LOCAL_HISTORY);
      } catch (serverErr) {
        console.warn('Failed to fetch from central server, falling back to local database:', serverErr);
      }
    }

    return localHistory;
  } catch (err) {
    console.error('Failed to get history:', err);
    return [];
  }
}

export async function clearHistory() {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to clear history locally:', err);
    return;
  }

  const token = await getSessionToken();
  if (token) {
    try {
      await requestJson('/api/history', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Local history was cleared, but account history could not be cleared:', err);
    }
  }
}

// Local Cached Plan Status
export function getUserTier() {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('userTier', (data) => {
          resolve(normalizeTier(data.userTier));
        });
        return;
      }
    } catch (e) {
      // Context invalidated
    }
    resolve(normalizeTier(localStorage.getItem('userTier')));
  });
}

export function setUserTier(tier) {
  const normalizedTier = normalizeTier(tier);
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ userTier: normalizedTier }, () => resolve());
        return;
      }
    } catch (e) {
      // Context invalidated
    }
    localStorage.setItem('userTier', normalizedTier);
    resolve();
  });
}
