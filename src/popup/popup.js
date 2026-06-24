import { getHistory, clearHistory } from '../lib/storage.js';
import { scorePrompt } from '../lib/scorer.js';

// Import library data
import libraryPrompts from '../../data/library.json' with { type: 'json' };

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initHistory();
  initLibrary();
  initDashboard();
});

// Tab Switching
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const activeTabId = `tab-${tab.dataset.tab}`;
      document.getElementById(activeTabId).classList.add('active');
      
      // Refresh views on tab change
      if (tab.dataset.tab === 'history') {
        renderHistory();
      } else if (tab.dataset.tab === 'dashboard') {
        renderDashboard();
      }
    });
  });
}

// Dashboard View
async function initDashboard() {
  await renderDashboard();
}

async function renderDashboard() {
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
    origAnalysis.missing.forEach(dim => {
      missingCounts[dim] = (missingCounts[dim] || 0) + 1;
    });
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
  clearBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear your optimization history? Your settings will not be affected.')) {
      await clearHistory();
      renderHistory();
      renderDashboard();
    }
  });

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

  // Load categories
  const categories = new Set(libraryPrompts.map(p => p.category));
  categories.forEach(cat => {
    const tag = document.createElement('div');
    tag.className = 'category-tag';
    tag.dataset.category = cat;
    tag.textContent = cat;
    catContainer.appendChild(tag);
  });

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
