import { 
  getHistory, 
  clearHistory, 
  getSessionToken, 
  clearSessionToken, 
  signupUser, 
  loginUser, 
  fetchUserProfile, 
  checkoutSubscription,
  getFavoritePrompts,
  toggleFavoritePrompt
} from '../lib/storage.js';
import { scorePrompt } from '../lib/scorer.js';
import { getCapturePreferences, setCapturePreferences, saveActivity, getSavedActivity, clearSavedActivity } from '../lib/activity.js';

// Import library data
import libraryPrompts from '../../data/library.json' with { type: 'json' };

let activityOffset = null;
function initSavedActivity() {
  const draft = document.getElementById('save-drafts');
  const search = document.getElementById('save-searches');
  const status = document.getElementById('activity-status');
  const update = async () => {
    if (!draft.checked && !confirm('Turn off prompt storage? The in-page optimizer will be locked until you enable it again. Existing entries are kept until you delete them or they expire.')) {
      draft.checked = true;
      return;
    }
    draft.disabled = search.disabled = true;
    try {
      const saved = await setCapturePreferences({saveDrafts:draft.checked,saveSearches:search.checked});
      document.getElementById('account-setup-notice').hidden = saved.saveDrafts;
      status.textContent = saved.saveDrafts
        ? 'Preferences saved. Changes apply to new activity.'
        : 'Prompt storage is off. The in-page optimizer is now locked.';
    } catch (error) {
      status.textContent = error.message;
      await loadSavedActivity();
    } finally { draft.disabled = search.disabled = !(await getSessionToken()); }
  };
  draft.addEventListener('change',update);
  search.addEventListener('change',update);
  document.getElementById('refresh-activity').addEventListener('click',()=>loadSavedActivity());
  document.getElementById('more-activity').addEventListener('click',()=>loadSavedActivity(true));
  document.getElementById('delete-activity').addEventListener('click',async () => {
    if(!confirm('Delete all saved drafts and searches from your account and turn off their capture? Optimization history is separate.')) return;
    try {
      await clearSavedActivity();
      await loadSavedActivity();
      status.textContent='Drafts and searches deleted. Capture is now off.';
    } catch(error) { status.textContent=error.message; }
  });
}
async function loadSavedActivity(append=false) {
  const status=document.getElementById('activity-status');
  const list=document.getElementById('activity-list');
  const more=document.getElementById('more-activity');
  const draft=document.getElementById('save-drafts');
  const search=document.getElementById('save-searches');
  const token=await getSessionToken();
  if(!append) { list.replaceChildren(); activityOffset=null; more.hidden=true; }
  draft.disabled=search.disabled=!token;
  document.getElementById('delete-activity').disabled=!token;
  if(!token) { draft.checked=search.checked=false;status.textContent='Sign in to manage saved activity.';return; }
  status.textContent='Loading saved activity...';
  more.disabled=true;
  try {
    const preferences=await getCapturePreferences(true);
    draft.checked=preferences.saveDrafts;search.checked=preferences.saveSearches;
    document.getElementById('account-setup-notice').hidden=preferences.saveDrafts;
    const data=await getSavedActivity(append?activityOffset:0);
    if(token !== await getSessionToken()) { list.replaceChildren(); return; }
    for(const entry of data.entries) {
      const article=document.createElement('article');article.className='activity-entry';
      const heading=document.createElement('h4');
      heading.textContent=(entry.kind==='draft'?'Draft':'Search')+' / '+entry.platform+' / '+new Date(entry.timestamp).toLocaleString();
      const text=document.createElement('p');text.textContent=entry.text;
      const copy=document.createElement('button');copy.type='button';copy.className='btn btn-secondary';copy.textContent='Copy';
      copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(entry.text);copy.textContent='Copied';}catch{status.textContent='Could not copy. Select the text to copy it.';}});
      article.append(heading,text,copy);list.append(article);
    }
    activityOffset=data.nextOffset;more.hidden=activityOffset===null;
    status.textContent=list.children.length?list.children.length+' recent entries.':'No saved drafts or searches yet.';
  } catch(error) { draft.disabled=search.disabled=true;status.textContent=error.message; }
  finally {more.disabled=false;}
}

let currentMode = 'login'; // login or signup
let appInitialized = false;
let authListenersInitialized = false;

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
});

// Authentication Checker
async function checkAuthStatus() {
  const authContainer = document.getElementById('auth-container');
  const authenticatedWrapper = document.getElementById('authenticated-wrapper');
  let user = null;
  const token = await getSessionToken();
  if (token) {
    try {
      user = await fetchUserProfile();
    } catch (err) {
      console.warn('Account status unavailable:', err);
    }
  }

  if (!authListenersInitialized) {
    initAuthListeners();
    authListenersInitialized = true;
  }

  if (!user) {
    authContainer.style.display = 'block';
    authenticatedWrapper.style.display = 'none';
    return;
  }

  authContainer.style.display = 'none';
  authenticatedWrapper.style.display = 'block';
  if (!appInitialized) {
    initTabs();
    initHistory();
    initSavedActivity();
    initFavorites();
    initLibrary();
    initSignout();
    initPayments();
    appInitialized = true;
  }
  const preferences = await getCapturePreferences(true).catch(() => ({saveDrafts:false}));
  document.getElementById('account-setup-notice').hidden = preferences.saveDrafts === true;
  await initDashboard(user);
}

// Authentication Forms Handlers
function initAuthListeners() {
  const title = document.getElementById('auth-title');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleLink = document.getElementById('auth-toggle-link');
  const toggleMsg = document.getElementById('auth-toggle-msg');
  const statusEl = document.getElementById('auth-status');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const storageConsent = document.getElementById('auth-storage-consent');
  const searchConsent = document.getElementById('auth-search-consent');
  
  statusEl.className = 'status-msg';
  statusEl.style.display = 'none';

  [emailInput, passwordInput].forEach((input) => {
    input.onkeydown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitBtn.click();
      }
    };
  });

  // Toggle Login/Signup
  toggleLink.onclick = (e) => {
    e.preventDefault();
    if (currentMode === 'login') {
      currentMode = 'signup';
      title.textContent = 'Create Account';
      submitBtn.textContent = 'Sign Up';
      toggleMsg.textContent = 'Already have an account?';
      toggleLink.textContent = 'Log In';
    } else {
      currentMode = 'login';
      title.textContent = 'Log In';
      submitBtn.textContent = 'Log In';
      toggleMsg.textContent = 'New to PromptIQ?';
      toggleLink.textContent = 'Create Account';
    }
    statusEl.style.display = 'none';
  };

  submitBtn.onclick = async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      statusEl.textContent = 'Email and password are required.';
      statusEl.className = 'status-msg status-error';
      statusEl.style.display = 'block';
      return;
    }
    if (!storageConsent.checked) {
      statusEl.textContent = 'Prompt storage consent is required to use PromptIQ.';
      statusEl.className = 'status-msg status-error';
      statusEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = currentMode === 'login' ? 'Logging in...' : 'Registering...';
    
    try {
      if (currentMode === 'login') {
        await loginUser(email, password);
      } else {
        await signupUser(email, password);
      }
      await setCapturePreferences({saveDrafts:true,saveSearches:searchConsent.checked});
      // Successful authentication! Reload status checks
      await checkAuthStatus();
    } catch (err) {
      await clearSessionToken();
      statusEl.textContent = err.message;
      statusEl.className = 'status-msg status-error';
      statusEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = currentMode === 'login' ? 'Log In' : 'Sign Up';
    }
  };
}

// Plan & Payments
function initPayments() {
  const upgradeBtn = document.getElementById('upgrade-pro-btn');
  if (!upgradeBtn) return;

  upgradeBtn.onclick = async () => {
    upgradeBtn.disabled = true;
    upgradeBtn.textContent = 'Opening checkout...';
    try {
      const token = await getSessionToken();
      if (!token) {
        await chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/onboarding.html') });
        return;
      }
      const checkoutUrl = await checkoutSubscription();
      await chrome.tabs.create({ url: checkoutUrl });
    } catch (err) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      upgradeBtn.disabled = false;
      upgradeBtn.textContent = (await getSessionToken()) ? 'Upgrade to Premium' : 'Sign in for Premium';
    }
  };
}

// Sign Out Control
function initSignout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;

  logoutBtn.onclick = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await clearSessionToken();
      await checkAuthStatus();
    }
  };
}

// Tab Switching
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const contents = document.querySelectorAll('.tab-content');

  const activateTab = async (tab) => {
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    contents.forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const activeTabId = `tab-${tab.dataset.tab}`;
    document.getElementById(activeTabId).classList.add('active');

    // Refresh views on tab change
    if (tab.dataset.tab === 'history') {
      renderHistory();
      loadSavedActivity();
    } else if (tab.dataset.tab === 'favorites') {
      renderFavorites();
    } else if (tab.dataset.tab === 'dashboard') {
      try {
        const user = await fetchUserProfile();
        renderDashboard(user);
      } catch (err) {
        // session expired, checkAuthStatus will handle it
        await checkAuthStatus();
      }
    }
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab(tab);
    });
    tab.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateTab(tab);
      }
    });
  });
}

// Dashboard View
async function initDashboard(user) {
  await renderDashboard(user);
}

async function renderDashboard(user) {
  const planStatusText = document.getElementById('plan-status-text');
  const loggedInUserText = document.getElementById('logged-in-user-text');
  const upgradeBtn = document.getElementById('upgrade-pro-btn');
  
  const history = await getHistory();

  if (user) {
    loggedInUserText.textContent = `Logged in as: ${user.email}`;
    if (user.plan === 'premium') {
      planStatusText.innerHTML = `<span style="color: var(--accent-cyan); font-weight: 800;">Premium Active</span>`;
      if (upgradeBtn) upgradeBtn.style.display = 'none';
    } else {
      planStatusText.innerHTML = `<span style="color: var(--text-secondary); font-weight: 700;">Free Plan</span>`;
      if (upgradeBtn) {
        upgradeBtn.style.display = 'block';
        upgradeBtn.textContent = 'Upgrade to Premium';
      }
    }
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.style.display = user ? 'block' : 'none';

  const avgScoreEl = document.getElementById('avg-score');
  const trendDescEl = document.getElementById('trend-desc');
  const optCountEl = document.getElementById('opt-count');
  const weeklyCountEl = document.getElementById('weekly-count');
  const weakDimensionTipEl = document.getElementById('weak-dimension-tip');

  if (history.length === 0) {
    avgScoreEl.textContent = '--';
    trendDescEl.textContent = 'No history yet';
    optCountEl.textContent = '0';
    weeklyCountEl.textContent = '0 this week';
    weakDimensionTipEl.textContent = 'Keep optimizing your prompts! The skill tracker will identify your weakest dimensions once you build a history.';
    return;
  }

  // Count runs
  optCountEl.textContent = history.length;
  
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyRuns = history.filter(h => h.timestamp > oneWeekAgo).length;
  weeklyCountEl.textContent = `${weeklyRuns} this week`;

  // Calculate Average Original Score & Trend
  let totalOrigScore = 0;
  let totalNewScore = 0;
  const missingCounts = {};

  history.forEach(run => {
    const origAnalysis = scorePrompt(run.original);
    const newAnalysis = scorePrompt(run.optimized);
    totalOrigScore += origAnalysis.score;
    totalNewScore += newAnalysis.score;

    // Track missing elements to identify weakest dimension
    if (origAnalysis.missing) {
      origAnalysis.missing.forEach(dim => {
        missingCounts[dim] = (missingCounts[dim] || 0) + 1;
      });
    }
  });

  const avgOrig = Math.round(totalOrigScore / history.length);
  const avgNew = Math.round(totalNewScore / history.length);
  avgScoreEl.textContent = `${avgOrig} → ${avgNew}`;

  const scoreDelta = avgNew - avgOrig;
  trendDescEl.textContent = `+${scoreDelta} pts improvement avg`;
  trendDescEl.className = 'stat-desc';

  // Identify Weakest Dimension
  let weakestDim = '';
  let maxMissing = 0;
  for (const [dim, count] of Object.entries(missingCounts)) {
    if (count > maxMissing) {
      maxMissing = count;
      weakestDim = dim;
    }
  }

  if (weakestDim) {
    const dimensionTips = {
      role: "Tip: Try starting your prompts by defining a persona (e.g., 'Act as an expert copywriter...'). This guides the AI's tone and depth.",
      context: "Tip: Provide more background context. Explain who the output is for, why you are writing it, and the scenario.",
      format: "Tip: Always specify the output structure you need (e.g., 'Format as a markdown table', 'Structure in bullet points').",
      constraints: "Tip: Add limits to keep outputs concise (e.g., 'Do not write introductory remarks', 'Max 200 words').",
      task: "Tip: Use clearer action verbs at the beginning (e.g., 'Analyze the data...', 'Generate a checklist...').",
      specificity: "Tip: Be more descriptive. Provide explicit examples, details, and details about your target audience."
    };
    weakDimensionTipEl.innerHTML = `<strong>Focus Area: ${weakestDim.toUpperCase()}</strong><br>${dimensionTips[weakestDim]}`;
  } else {
    weakDimensionTipEl.textContent = "Great job! Your prompts score well across all dimensions. Keep up the high standard!";
  }

}

// History Management
function initHistory() {
  const clearBtn = document.getElementById('clear-history-btn');
  clearBtn.onclick = async () => {
    if (confirm('Are you sure you want to clear your optimization history? Your settings will not be affected.')) {
      await clearHistory();
      renderHistory();
      // Reload profile to refresh stats
      const user = await fetchUserProfile();
      renderDashboard(user);
    }
  };

  renderHistory();
}

async function renderHistory() {
  const container = document.getElementById('history-container');
  const summaryEl = document.getElementById('history-summary');
  const history = await getHistory();

  summaryEl.textContent = `${history.length} saved run${history.length !== 1 ? 's' : ''}`;

  if (history.length === 0) {
    container.innerHTML = `<div style="color: var(--text-secondary); text-align: center; margin-top: 40px; font-size: 13px;">No history yet. Get started by optimizing your prompts inline!</div>`;
    return;
  }

  container.innerHTML = history.map((run, index) => {
    const delta = run.scoreDelta;
    const deltaClass = delta >= 0 ? 'history-delta' : 'history-delta negative';
    const deltaText = delta >= 0 ? `+${delta}` : `${delta}`;
    const dateStr = new Date(run.timestamp).toLocaleDateString();
    const modeLabel = run.mode ? run.mode.charAt(0).toUpperCase() + run.mode.slice(1) : 'Standard';
    const intentLabel = run.intent ? run.intent.charAt(0).toUpperCase() + run.intent.slice(1) : 'General';

    return `
      <div class="history-item" data-index="${index}">
        <div class="history-top">
          <span class="history-platform">${escapeHtml(run.platform)}</span>
          <span class="history-platform">${escapeHtml(modeLabel)}</span>
          <span class="history-platform">${escapeHtml(intentLabel)}</span>
          <span style="font-size: 11px; color: var(--text-secondary);">${dateStr}</span>
          <span class="${deltaClass}">${deltaText} pts</span>
        </div>
        <div class="history-prompt">${escapeHtml(run.original)}</div>
        <div class="history-expanded" id="hist-exp-${index}">
          <div style="font-weight: 600; font-size: 11px; margin-bottom: 4px; color: var(--text-secondary);">Original Prompt:</div>
          <div class="history-detail-box">${escapeHtml(run.original)}</div>
          <div style="font-weight: 600; font-size: 11px; margin-bottom: 4px; color: var(--text-secondary);">Optimized:</div>
          <div class="history-detail-box">${escapeHtml(run.optimized)}</div>
          <div class="history-actions">
            <button class="btn btn-secondary favorite-hist-btn" data-index="${index}" style="padding: 4px 8px; font-size: 11px; width: auto;">Favorite</button>
            <button class="btn btn-secondary copy-hist-btn" data-index="${index}" style="padding: 4px 8px; font-size: 11px; width: auto;">Use Optimized</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Expand click handlers
  const items = container.querySelectorAll('.history-item');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('copy-hist-btn')) return;
      const index = item.dataset.index;
      const exp = container.querySelector(`#hist-exp-${index}`);
      exp.classList.toggle('visible');
    });
  });

  // Copy/Insert buttons
  container.querySelectorAll('.copy-hist-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const text = history[Number(btn.dataset.index)]?.optimized || '';
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          await chrome.tabs.sendMessage(tab.id, { action: 'INSERT_PROMPT', text });
          btn.textContent = 'Used in Chat!';
        } else {
          throw new Error('No active tab');
        }
      } catch (err) {
        navigator.clipboard.writeText(text);
        btn.textContent = 'Copied!';
      }
      setTimeout(() => { btn.textContent = 'Use Optimized'; }, 2000);
    });
  });

  container.querySelectorAll('.favorite-hist-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const run = history[Number(btn.dataset.index)];
      if (!run) return;
      const result = await toggleFavoritePrompt({
        original: run.original,
        optimized: run.optimized,
        platform: run.platform,
        intent: run.intent,
        mode: run.mode,
        scoreOriginal: run.scoreOriginal,
        scoreOptimized: run.scoreOptimized,
        timestamp: Date.now()
      });
      btn.textContent = result.favorite ? 'Favorited' : 'Favorite';
      renderFavorites();
    });
  });
}

function initFavorites() {
  renderFavorites();
}

async function renderFavorites() {
  const container = document.getElementById('favorites-container');
  const summaryEl = document.getElementById('favorites-summary');
  if (!container || !summaryEl) return;

  const favorites = await getFavoritePrompts();
  summaryEl.textContent = `${favorites.length} favorite prompt${favorites.length !== 1 ? 's' : ''}`;

  if (favorites.length === 0) {
    container.innerHTML = `<div style="color: var(--text-secondary); text-align: center; margin-top: 40px; font-size: 13px;">No favorites yet. Save strong optimized prompts from the in-page panel or history.</div>`;
    return;
  }

  container.innerHTML = favorites.map((favorite, index) => {
    const dateStr = new Date(favorite.timestamp).toLocaleDateString();
    const modeLabel = favorite.mode ? favorite.mode.charAt(0).toUpperCase() + favorite.mode.slice(1) : 'Standard';
    const scoreLabel = Number.isFinite(favorite.scoreOriginal) && Number.isFinite(favorite.scoreOptimized)
      ? `${favorite.scoreOriginal} -> ${favorite.scoreOptimized}`
      : 'Saved';

    return `
      <div class="history-item" data-index="${index}">
        <div class="history-top">
          <span class="history-platform">${escapeHtml(favorite.platform)}</span>
          <span class="history-platform">${escapeHtml(modeLabel)}</span>
          <span style="font-size: 11px; color: var(--text-secondary);">${dateStr}</span>
          <span class="history-delta">${scoreLabel}</span>
        </div>
        <div class="history-prompt">${escapeHtml(favorite.optimized)}</div>
        <div class="history-expanded" id="fav-exp-${index}">
          <div style="font-weight: 600; font-size: 11px; margin-bottom: 4px; color: var(--text-secondary);">Original Prompt:</div>
          <div class="history-detail-box">${escapeHtml(favorite.original)}</div>
          <div style="font-weight: 600; font-size: 11px; margin-bottom: 4px; color: var(--text-secondary);">Favorite Optimized Prompt:</div>
          <div class="history-detail-box">${escapeHtml(favorite.optimized)}</div>
          <div class="history-actions">
            <button class="btn btn-secondary remove-fav-btn" data-index="${index}" style="padding: 4px 8px; font-size: 11px; width: auto;">Remove</button>
            <button class="btn btn-secondary use-fav-btn" data-index="${index}" style="padding: 4px 8px; font-size: 11px; width: auto;">Use Prompt</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      const index = item.dataset.index;
      const expanded = container.querySelector(`#fav-exp-${index}`);
      expanded.classList.toggle('visible');
    });
  });

  container.querySelectorAll('.use-fav-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = favorites[Number(btn.dataset.index)]?.optimized || '';
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          await chrome.tabs.sendMessage(tab.id, { action: 'INSERT_PROMPT', text });
          btn.textContent = 'Used in Chat!';
        } else {
          throw new Error('No active tab');
        }
      } catch (err) {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied!';
      }
      setTimeout(() => { btn.textContent = 'Use Prompt'; }, 2000);
    });
  });

  container.querySelectorAll('.remove-fav-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const favorite = favorites[Number(btn.dataset.index)];
      if (!favorite) return;
      await toggleFavoritePrompt(favorite);
      renderFavorites();
    });
  });
}

// Library View
function initLibrary() {
  const searchInput = document.getElementById('library-search');
  const catContainer = document.getElementById('category-list');

  // Load categories if not already added
  if (catContainer.children.length === 1) {
    const categories = new Set(libraryPrompts.map(p => p.category));
    categories.forEach(cat => {
      const tag = document.createElement('div');
      tag.className = 'category-tag';
      tag.dataset.category = cat;
      tag.textContent = cat;
      catContainer.appendChild(tag);
    });
  }

  // Category tags click handlers
  const tags = catContainer.querySelectorAll('.category-tag');
  tags.forEach(tag => {
    tag.addEventListener('click', () => {
      tags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      filterLibrary();
    });
  });

  searchInput.addEventListener('input', filterLibrary);
  let lastSearch = {key:'',time:0};
  const saveSearch = async () => {
    const text = searchInput.value.trim();
    const category = document.querySelector('.category-tag.active').dataset.category;
    const key = JSON.stringify([text, category]);
    if (!text || (key === lastSearch.key && Date.now()-lastSearch.time<750)) return;
    lastSearch = {key,time:Date.now()};
    await saveActivity({
      kind:'search', clientId:crypto.randomUUID(), text, category, resultCount:filterLibrary()
    });
  };
  searchInput.addEventListener('change', saveSearch);
  searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); saveSearch(); }
  });

  renderLibrary(libraryPrompts);
}

function filterLibrary() {
  const search = document.getElementById('library-search').value.toLowerCase();
  const activeCat = document.querySelector('.category-tag.active').dataset.category;

  const filtered = libraryPrompts.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search) || item.prompt.toLowerCase().includes(search);
    const matchesCat = activeCat === 'all' || item.category === activeCat;
    return matchesSearch && matchesCat;
  });

  renderLibrary(filtered);
  return filtered.length;
}

function renderLibrary(prompts) {
  const container = document.getElementById('library-container');
  if (prompts.length === 0) {
    container.innerHTML = `<div style="color: var(--text-secondary); text-align: center; margin-top: 40px; font-size: 13px;">No matching library prompts found.</div>`;
    return;
  }

  container.innerHTML = prompts.map(item => `
    <div class="library-item">
      <div class="library-category">${escapeHtml(item.category)}</div>
      <div class="library-title">${escapeHtml(item.title)}</div>
      <div class="library-prompt-text">${escapeHtml(item.prompt)}</div>
      <button class="btn btn-secondary copy-lib-btn" data-text="${escapeDoubleQuotes(item.prompt)}" style="padding: 4px 8px; font-size: 11px;">Use Prompt Template</button>
    </div>
  `).join('');

  container.querySelectorAll('.copy-lib-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.text;
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          await chrome.tabs.sendMessage(tab.id, { action: 'INSERT_PROMPT', text });
          btn.textContent = 'Used in Chat!';
        } else {
          throw new Error('No active tab');
        }
      } catch (err) {
        navigator.clipboard.writeText(text);
        btn.textContent = 'Copied to Clipboard!';
      }
      setTimeout(() => { btn.textContent = 'Use Prompt Template'; }, 2000);
    });
  });
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeDoubleQuotes(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;');
}

// Onboarding page launcher
document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('view-onboarding-link')) {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/onboarding.html') });
    }
  });
});
