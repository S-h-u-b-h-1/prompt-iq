/**
 * Extension storage and API wrappers for PromptIQ.
 */

const API_BASE = 'https://promptiq-theta.vercel.app';
const REQUEST_TIMEOUT_MS = 15000;
const MAX_FAVORITE_PROMPTS = 100;
const FAVORITES_KEY = 'favoritePrompts';
const DAILY_USAGE_KEY = 'dailyUsage';
export const FREE_SMART_TEMPLATE_DAILY_LIMIT = 100;

export function normalizeTier() {
  return 'free';
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSmartTemplateDailyLimit() {
  return FREE_SMART_TEMPLATE_DAILY_LIMIT;
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

// Session Token Management
export function getSessionToken() {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('sessionToken', (data) => {
          resolve(data?.sessionToken || null);
        });
        return;
      }
    } catch (e) {
      // Context invalidated
    }
    resolve(getDevelopmentStorage()?.getItem('sessionToken') || null);
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
    getDevelopmentStorage()?.setItem('sessionToken', token);
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
    const storage = getDevelopmentStorage();
    keys.forEach(k => storage?.removeItem(k));
    resolve();
  });
}

function getDevelopmentStorage() {
  if (typeof window === 'undefined') return globalThis.localStorage;
  if (import.meta.env?.DEV && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    return window.localStorage;
  }
  return null;
}

function getExtensionStorageValue(key, fallbackValue) {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(key, (data) => {
          resolve(data?.[key] ?? fallbackValue);
        });
        return;
      }
    } catch (e) {
      // Context invalidated
    }

    try {
      const raw = getDevelopmentStorage()?.getItem(key);
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

    getDevelopmentStorage()?.setItem(key, JSON.stringify(value));
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

export async function getSmartTemplateQuotaStatus(tier) {
  const date = getLocalDateKey();
  const usage = await getExtensionStorageValue(DAILY_USAGE_KEY, { date, smartTemplate: 0 });
  const normalizedUsage = usage && usage.date === date
    ? usage
    : { date, smartTemplate: 0 };
  const used = Number.isFinite(normalizedUsage.smartTemplate)
    ? normalizedUsage.smartTemplate
    : 0;
  const limit = getSmartTemplateDailyLimit(tier);

  return {
    date,
    used,
    limit,
    remaining: Math.max(0, limit - used)
  };
}

export async function consumeSmartTemplateQuota(tier) {
  const status = await getSmartTemplateQuotaStatus(tier);
  if (status.remaining <= 0) {
    const error = new Error('Daily Quick Rewrite limit reached. Free accounts include 100 on-device rewrites per day.');
    error.status = 429;
    error.code = 'LOCAL_DAILY_LIMIT_REACHED';
    error.limit = status.limit;
    error.used = status.used;
    throw error;
  }

  const nextUsage = {
    date: status.date,
    smartTemplate: status.used + 1
  };
  await setExtensionStorageValue(DAILY_USAGE_KEY, nextUsage);

  return {
    ...status,
    used: nextUsage.smartTemplate,
    remaining: Math.max(0, status.limit - nextUsage.smartTemplate)
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
    getDevelopmentStorage()?.setItem('userEmail', data.user.email);
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
    getDevelopmentStorage()?.setItem('userEmail', data.user.email);
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

export async function getUsageStatus() {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    return await requestJson('/api/usage', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      await clearSessionToken();
      return null;
    }
    throw error;
  }
}

export async function trackTelemetry(eventType) {
  const token = await getSessionToken();
  if (!token) return;
  try {
    await requestJson('/api/telemetry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ event_type: eventType })
    });
  } catch (error) {
    // Analytics must never interrupt the extension workflow.
  }
}

export async function saveOptimization(original, optimized, scoreDelta, platform, intent, mode, scoreOriginal, scoreOptimized, engine, expectedToken) {
  const token = await getSessionToken();
  if (!token || token !== expectedToken) return null;

  try {
    const saved = await requestJson('/api/history', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientEventId: crypto.randomUUID(),
        original, optimized, scoreDelta, platform, intent, mode, scoreOriginal, scoreOptimized, engine
      })
    });
    return saved.data?.id ?? null;
  } catch {
    return null;
  }
}

export async function getHistory() {
  const token = await getSessionToken();
  if (!token) return [];
  try {
    const history = await requestJson('/api/history', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return token === await getSessionToken() && Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

export async function clearHistory() {
  const token = await getSessionToken();
  if (!token) throw new Error('Sign in to clear your history.');
  await requestJson('/api/history', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function setUserTier(tier) {
  return setExtensionStorageValue('userTier', normalizeTier(tier));
}
