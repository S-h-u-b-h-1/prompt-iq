import { 
  getHistory, 
  clearHistory, 
  getSessionToken, 
  clearSessionToken, 
  signupUser, 
  loginUser, 
  fetchUserProfile, 
  checkoutSubscription
} from '../lib/storage.js';
import { scorePrompt } from '../lib/scorer.js';

// Import library data
import libraryPrompts from '../../data/library.json' with { type: 'json' };

let currentMode = 'login'; // login or signup

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
});

// Authentication Checker
async function checkAuthStatus() {
  const authContainer = document.getElementById('auth-container');
  const authenticatedWrapper = document.getElementById('authenticated-wrapper');
  
  const token = await getSessionToken();
  if (!token) {
    authContainer.style.display = 'block';
    authenticatedWrapper.style.display = 'none';
    initAuthListeners();
    return;
  }

  try {
    // Verify token with server profile request
    const user = await fetchUserProfile();
    if (!user) {
      throw new Error('Session invalid');
    }

    authContainer.style.display = 'none';
    authenticatedWrapper.style.display = 'block';

    // Initialize authenticated layouts
    initTabs();
    initHistory();
    initLibrary();
    initDashboard(user);
    initSignout();
    initPayments();
  } catch (err) {
    console.warn('Session expired or server error:', err);
    authContainer.style.display = 'block';
    authenticatedWrapper.style.display = 'none';
    initAuthListeners();
    const statusEl = document.getElementById('auth-status');
    statusEl.textContent = err.message || 'Unable to verify your account. Free mode remains available.';
    statusEl.className = 'status-msg status-error';
    statusEl.style.display = 'block';
  }
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

    submitBtn.disabled = true;
    submitBtn.textContent = currentMode === 'login' ? 'Logging in...' : 'Registering...';
    
    try {
      if (currentMode === 'login') {
        await loginUser(email, password);
      } else {
        await signupUser(email, password);
      }
      // Successful authentication! Reload status checks
      await checkAuthStatus();
    } catch (err) {
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
    upgradeBtn.textContent = 'Redirecting...';
    try {
      const checkoutUrl = await checkoutSubscription();
      // Redirect to Stripe checkout session
      window.open(checkoutUrl, '_blank');
    } catch (err) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      upgradeBtn.disabled = false;
      upgradeBtn.textContent = 'Upgrade to Premium';
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
  
  if (user) {
    loggedInUserText.textContent = `Logged in as: ${user.email}`;
    if (user.plan === 'premium') {
      planStatusText.innerHTML = `<span style="color: #2563eb; font-weight: 700;">Premium Plan (Active)</span>`;
      if (upgradeBtn) upgradeBtn.style.display = 'none';
    } else {
      planStatusText.innerHTML = `<span style="color: #64748b; font-weight: 700;">⚡ Free Plan</span>`;
      if (upgradeBtn) upgradeBtn.style.display = 'block';
    }
  }

  const history = await getHistory();
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
    container.innerHTML = `<div style="color: #64748b; text-align: center; margin-top: 40px; font-size: 13px;">No history yet. Get started by optimizing your prompts inline!</div>`;
    return;
  }

  container.innerHTML = history.map((run, index) => {
    const delta = run.scoreDelta;
    const deltaClass = delta >= 0 ? 'history-delta' : 'history-delta negative';
    const deltaText = delta >= 0 ? `+${delta}` : `${delta}`;
    const dateStr = new Date(run.timestamp).toLocaleDateString();

    return `
      <div class="history-item" data-index="${index}">
        <div class="history-top">
          <span class="history-platform">${run.platform}</span>
          <span style="font-size: 11px; color: #94a3b8;">${dateStr}</span>
          <span class="${deltaClass}">${deltaText} pts</span>
        </div>
        <div class="history-prompt">${escapeHtml(run.original)}</div>
        <div class="history-expanded" id="hist-exp-${index}">
          <div style="font-weight: 600; font-size: 11px; margin-bottom: 4px; color: #475569;">Original Prompt:</div>
          <div class="history-detail-box">${escapeHtml(run.original)}</div>
          <div style="font-weight: 600; font-size: 11px; margin-bottom: 4px; color: #475569;">Optimized:</div>
          <div class="history-detail-box">${escapeHtml(run.optimized)}</div>
          <div class="history-actions">
            <button class="btn btn-secondary copy-hist-btn" data-text="${escapeDoubleQuotes(run.optimized)}" style="padding: 4px 8px; font-size: 11px; width: auto;">Copy Optimized</button>
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
        btn.textContent = 'Copied!';
      }
      setTimeout(() => { btn.textContent = 'Copy Optimized'; }, 2000);
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
}

function renderLibrary(prompts) {
  const container = document.getElementById('library-container');
  if (prompts.length === 0) {
    container.innerHTML = `<div style="color: #64748b; text-align: center; margin-top: 40px; font-size: 13px;">No matching library prompts found.</div>`;
    return;
  }

  container.innerHTML = prompts.map(item => `
    <div class="library-item">
      <div class="library-category">${item.category}</div>
      <div class="library-title">${item.title}</div>
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
