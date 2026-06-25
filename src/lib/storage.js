/**
 * Chrome Storage Local, IndexedDB & API wrappers for PromptIQ
 */

const DB_NAME = 'PromptIQ_DB';
const STORE_NAME = 'history';
const DB_VERSION = 1;
const API_BASE = 'https://promptiq-theta.vercel.app';

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

// Session Token Management
export function getSessionToken() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('sessionToken', (data) => {
        resolve(data.sessionToken || null);
      });
    } else {
      resolve(localStorage.getItem('sessionToken') || null);
    }
  });
}

export function setSessionToken(token) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ sessionToken: token }, () => resolve());
    } else {
      localStorage.setItem('sessionToken', token);
      resolve();
    }
  });
}

export function clearSessionToken() {
  return new Promise((resolve) => {
    const keys = ['sessionToken', 'userTier', 'userEmail'];
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(keys, () => resolve());
    } else {
      keys.forEach(k => localStorage.removeItem(k));
      resolve();
    }
  });
}

// Auth Actions
export async function signupUser(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to sign up');
  }

  await setSessionToken(data.token);
  await setUserTier(data.user.plan);
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ userEmail: data.user.email });
  } else {
    localStorage.setItem('userEmail', data.user.email);
  }
  return data;
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to log in');
  }

  await setSessionToken(data.token);
  await setUserTier(data.user.plan);
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

  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    await clearSessionToken();
    return null;
  }

  const data = await response.json();
  await setUserTier(data.user.plan);
  return data.user;
}

// Subscription Actions
export async function checkoutSubscription() {
  const token = await getSessionToken();
  if (!token) throw new Error('You must be logged in to subscribe.');

  const response = await fetch(`${API_BASE}/api/subscription/checkout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to initiate checkout');
  }
  return data.url;
}

export async function logTelemetryEvent(eventType) {
  const token = await getSessionToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}/api/telemetry`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ event_type: eventType })
    });
    return response.ok;
  } catch (err) {
    console.error('Telemetry logging failed:', err);
    return false;
  }
}

export async function submitSurveyResponses(surveyData) {
  const token = await getSessionToken();
  if (!token) throw new Error('You must be logged in to submit a survey.');

  const response = await fetch(`${API_BASE}/api/survey`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(surveyData)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit survey responses');
  }
  return true;
}

// User ID fallback (local tracking, unused for server auth)
export function getUserId() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('userId', (data) => {
        if (data.userId) resolve(data.userId);
        else {
          const newId = generateUUID();
          chrome.storage.local.set({ userId: newId }, () => resolve(newId));
        }
      });
    } else {
      let localId = localStorage.getItem('userId');
      if (!localId) {
        localId = generateUUID();
        localStorage.setItem('userId', localId);
      }
      resolve(localId);
    }
  });
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// IndexedDB Actions (Synchronized via JWT Authorization)
export async function saveOptimization(original, optimized, scoreDelta, platform, intent = null, mode = null, scoreOriginal = null, scoreOptimized = null) {
  try {
    // 1. Save locally
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    store.add({
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

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });

    // 2. Save centrally on Neon
    const token = await getSessionToken();
    if (token) {
      const response = await fetch(`${API_BASE}/api/save`, {
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
      
      if (response.ok) {
        const data = await response.json();
        return data.data?.id;
      }
    }
  } catch (err) {
    console.error('Failed to save history:', err);
  }
  return null;
}

export async function getHistory() {
  try {
    const token = await getSessionToken();
    if (token) {
      // Try to fetch from server with JWT auth
      try {
        const response = await fetch(`${API_BASE}/api/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const serverHistory = await response.json();
          return serverHistory;
        }
      } catch (serverErr) {
        console.warn('Failed to fetch from central server, falling back to local database:', serverErr);
      }
    }

    // Fallback to local IndexedDB
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const sorted = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(sorted);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to get history:', err);
    return [];
  }
}

export async function clearHistory() {
  try {
    // 1. Clear locally
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });

    // 2. Clear centrally
    const token = await getSessionToken();
    if (token) {
      fetch(`${API_BASE}/api/clear`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.error('Failed to clear central history:', err));
    }
  } catch (err) {
    console.error('Failed to clear history locally:', err);
  }
}

// Local Cached Plan Status
export function getUserTier() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('userTier', (data) => {
        resolve(data.userTier || 'free');
      });
    } else {
      resolve(localStorage.getItem('userTier') || 'free');
    }
  });
}

export function setUserTier(tier) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ userTier: tier }, () => resolve());
    } else {
      localStorage.setItem('userTier', tier);
      resolve();
    }
  });
}

// Client-side rate estimation (acts as a backup UI indicator; limits are strictly enforced on Vercel)
export async function checkDailyLimit() {
  const token = await getSessionToken();
  if (token) {
    try {
      const profile = await fetchUserProfile();
      if (profile && profile.plan === 'pro') {
        return { allowed: true, count: 0 };
      }
    } catch (err) {
      // Fallback to local
    }
  }

  const today = new Date().toDateString();
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['optCountDate', 'optCountValue'], (data) => {
        const savedDate = data.optCountDate;
        let count = data.optCountValue || 0;
        if (savedDate !== today) {
          chrome.storage.local.set({ optCountDate: today, optCountValue: 0 }, () => {
            resolve({ allowed: true, count: 0 });
          });
        } else {
          resolve({ allowed: count < 5, count });
        }
      });
    });
  } else {
    const savedDate = localStorage.getItem('optCountDate');
    let count = parseInt(localStorage.getItem('optCountValue') || '0', 10);
    if (savedDate !== today) {
      localStorage.setItem('optCountDate', today);
      localStorage.setItem('optCountValue', '0');
      return { allowed: true, count: 0 };
    } else {
      return { allowed: count < 5, count };
    }
  }
}

export function incrementDailyOptimization() {
  return new Promise((resolve) => {
    const today = new Date().toDateString();
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['optCountDate', 'optCountValue'], (data) => {
        let count = (data.optCountValue || 0) + 1;
        chrome.storage.local.set({ optCountDate: today, optCountValue: count }, () => resolve(count));
      });
    } else {
      let count = parseInt(localStorage.getItem('optCountValue') || '0', 10) + 1;
      localStorage.setItem('optCountDate', today);
      localStorage.setItem('optCountValue', count.toString());
      resolve(count);
    }
  });
}
