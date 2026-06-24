/**
 * Chrome Storage Local & IndexedDB wrappers for PromptIQ
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

// Helper to get or generate unique User ID
export function getUserId() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('userId', (data) => {
        if (data.userId) {
          resolve(data.userId);
        } else {
          const newId = generateUUID();
          chrome.storage.local.set({ userId: newId }, () => {
            resolve(newId);
          });
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

// IndexedDB Actions
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

    // 2. Save centrally on the Neon DB via Vercel Serverless Function
    const userId = await getUserId();
    const response = await fetch(`${API_BASE}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        original,
        optimized,
        scoreDelta,
        platform,
        userId,
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
  } catch (err) {
    console.error('Failed to save history:', err);
  }
  return null;
}

export async function getHistory() {
  try {
    const userId = await getUserId();
    // 1. Try to fetch from server
    try {
      const response = await fetch(`${API_BASE}/api/history?userId=${userId}`);
      if (response.ok) {
        const serverHistory = await response.json();
        return serverHistory;
      }
    } catch (serverErr) {
      console.warn('Failed to fetch from central server, falling back to local database:', serverErr);
    }

    // 2. Fallback to local IndexedDB
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // Sort newest first
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
    const userId = await getUserId();
    fetch(`${API_BASE}/api/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    }).catch(err => console.error('Failed to clear central history:', err));

  } catch (err) {
    console.error('Failed to clear history locally:', err);
  }
}



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

export function checkDailyLimit() {
  return new Promise((resolve) => {
    const today = new Date().toDateString();
    
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['optCountDate', 'optCountValue'], (data) => {
        const savedDate = data.optCountDate;
        let count = data.optCountValue || 0;
        
        if (savedDate !== today) {
          count = 0;
          chrome.storage.local.set({ optCountDate: today, optCountValue: 0 }, () => {
            resolve({ allowed: true, count: 0 });
          });
        } else {
          resolve({ allowed: count < 5, count });
        }
      });
    } else {
      const savedDate = localStorage.getItem('optCountDate');
      let count = parseInt(localStorage.getItem('optCountValue') || '0', 10);
      
      if (savedDate !== today) {
        count = 0;
        localStorage.setItem('optCountDate', today);
        localStorage.setItem('optCountValue', '0');
        resolve({ allowed: true, count: 0 });
      } else {
        resolve({ allowed: count < 5, count });
      }
    }
  });
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
