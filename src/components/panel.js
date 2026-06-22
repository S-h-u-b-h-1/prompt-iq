export function createPanel(onOptimize, onUse) {
  const container = document.createElement('div');
  container.id = 'promptiq-container';
  container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999999; font-family: system-ui, -apple-system, sans-serif;';
  
  let isCooldownActive = false;
  
  // Theme detection
  const isDark = document.documentElement.classList.contains('dark') || 
                 document.body.classList.contains('dark') || 
                 document.documentElement.getAttribute('data-theme') === 'dark' ||
                 window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (isDark) {
    container.classList.add('dark-mode');
  }

  const shadow = container.attachShadow({ mode: 'open' });
  
  const style = document.createElement('style');
  style.textContent = `
    :host {
      --bg-color: rgba(255, 255, 255, 0.9);
      --border-color: rgba(226, 232, 240, 0.8);
      --text-color: #334155;
      --title-color: #0f172a;
      --sec-bg: rgba(248, 250, 252, 0.6);
      --input-border: rgba(203, 213, 225, 0.8);
      --badge-bg: rgba(248, 250, 252, 0.85);
      --badge-border: rgba(226, 232, 240, 0.85);
      --badge-text: #475569;
      --shadow-color: rgba(0, 0, 0, 0.04);
      --panel-shadow: rgba(0, 0, 0, 0.1);
    }
    :host(.dark-mode) {
      --bg-color: rgba(30, 41, 59, 0.9);
      --border-color: rgba(71, 85, 105, 0.8);
      --text-color: #cbd5e1;
      --title-color: #ffffff;
      --sec-bg: rgba(15, 23, 42, 0.6);
      --input-border: rgba(71, 85, 105, 0.8);
      --badge-bg: rgba(51, 65, 85, 0.85);
      --badge-border: rgba(71, 85, 105, 0.85);
      --badge-text: #f1f5f9;
      --shadow-color: rgba(0, 0, 0, 0.2);
      --panel-shadow: rgba(0, 0, 0, 0.4);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 24px;
      background: var(--badge-bg);
      border: 1px solid var(--badge-border);
      color: var(--badge-text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px var(--shadow-color);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .badge:hover {
      background: var(--border-color);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px var(--shadow-color);
    }
    :host(.panel-open) .badge {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.8) translateY(10px);
    }
    .score-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #cbd5e1;
    }
    .score-excellent { background: #10b981; box-shadow: 0 0 8px #10b981; }
    .score-good { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
    .score-fair { background: #f97316; box-shadow: 0 0 8px #f97316; }
    .score-weak { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
    
    .panel-wrapper {
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 24px;
      right: 24px;
      bottom: 24px;
      width: 420px;
      max-width: calc(100vw - 48px);
      background: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px var(--panel-shadow), 0 10px 10px -5px var(--panel-shadow);
      padding: 24px;
      color: var(--text-color);
      box-sizing: border-box;
      z-index: 1000000;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      
      transform: translateX(calc(100% + 48px));
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
      opacity: 0;
      pointer-events: none;
    }
    .panel-wrapper.visible {
      transform: translateX(0);
      opacity: 1;
      pointer-events: auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 10px;
    }
    .title { font-weight: 700; font-size: 16px; color: var(--title-color); }
    
    .missing-items {
      font-size: 12px;
      color: var(--text-color);
      margin-bottom: 14px;
      opacity: 0.8;
    }
    .missing-tag {
      display: inline-block;
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-right: 6px;
      margin-bottom: 6px;
      font-weight: 600;
    }
    :host(.dark-mode) .missing-tag {
      background: rgba(239, 68, 68, 0.25);
      color: #fca5a5;
    }
    .btn {
      padding: 9px 16px;
      border-radius: 8px;
      border: 1px solid transparent;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary {
      background: var(--badge-bg);
      color: var(--text-color);
      border-color: var(--border-color);
    }
    .btn-secondary:hover { background: var(--border-color); }
    
    .result-section {
      display: none;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--border-color);
    }
    
    .editable-container {
      position: relative;
      margin-bottom: 12px;
    }
    
    .optimized-textarea {
      width: 100%;
      height: 120px;
      font-size: 13px;
      line-height: 1.5;
      background: var(--sec-bg);
      border: 1px solid var(--input-border);
      border-radius: 8px;
      padding: 10px;
      resize: vertical;
      font-family: inherit;
      color: var(--text-color);
      box-sizing: border-box;
    }
    .optimized-textarea:focus {
      outline: none;
      border-color: #2563eb;
      background: var(--bg-color);
    }

    .diff-view {
      font-size: 13px;
      line-height: 1.5;
      background: var(--sec-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px;
      max-height: 120px;
      overflow-y: auto;
      margin-bottom: 12px;
      white-space: pre-wrap;
      color: var(--text-color);
    }
    .diff-added {
      background: #dcfce7;
      color: #14532d;
      font-weight: 500;
      padding: 1px 2px;
      border-radius: 2px;
    }
    :host(.dark-mode) .diff-added {
      background: #14532d;
      color: #dcfce7;
    }

    .changes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      cursor: pointer;
      user-select: none;
    }
    .changes-title {
      font-weight: 600;
      font-size: 13px;
      color: var(--text-color);
      opacity: 0.9;
    }
    
    .changes-list {
      font-size: 12px;
      list-style: none;
      padding: 0;
      margin: 0 0 14px 0;
      max-height: 140px;
      overflow-y: auto;
      display: none;
    }
    .changes-list.expanded {
      display: block;
    }
    .change-item {
      display: flex;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid var(--sec-bg);
    }
    .change-icon {
      font-size: 14px;
      flex-shrink: 0;
    }
    .change-content {
      line-height: 1.4;
    }
    .change-label {
      font-weight: 600;
      color: var(--title-color);
    }
    
    .loader {
      display: none;
      font-size: 13px;
      color: var(--text-color);
      margin-top: 14px;
      text-align: center;
      opacity: 0.8;
    }
  `;
  shadow.appendChild(style);

  // Score Badge
  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.innerHTML = `<div class="score-dot" id="score-dot"></div><span id="score-text">PromptIQ: 0</span>`;
  shadow.appendChild(badge);

  // Main Panel
  const panel = document.createElement('div');
  panel.className = 'panel-wrapper';
  panel.innerHTML = `
    <div class="header">
      <div class="title">PromptIQ Optimizer</div>
      <button class="btn btn-secondary" id="close-btn" style="padding: 4px 8px; font-size: 12px;">Close</button>
    </div>
    <div class="missing-items" id="missing-container">
      <strong>Missing:</strong> <span id="missing-list">none</span>
    </div>
    <div style="display: flex; gap: 8px; justify-content: space-between; align-items: center;">
      <button class="btn btn-primary" id="optimize-btn" style="width: 100%;">Optimize Prompt</button>
    </div>
    <div class="loader" id="loader">Optimizing prompt...</div>
    
    <div class="result-section" id="result-section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-weight: 600; font-size: 13px; color: var(--text-color);">Optimized Output:</span>
        <button class="btn btn-secondary" id="toggle-edit-btn" style="padding: 2px 6px; font-size: 11px;">Edit Text</button>
      </div>
      
      <div class="editable-container">
        <div class="diff-view" id="diff-view"></div>
        <textarea class="optimized-textarea" id="optimized-text" style="display: none;"></textarea>
      </div>
      
      <div class="changes-header" id="changes-header">
        <span class="changes-title">🔍 Changes Explained</span>
        <span style="font-size: 12px; color: #2563eb;" id="toggle-changes-label">Show</span>
      </div>
      <ul class="changes-list" id="changes-list"></ul>
      
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn btn-primary" id="use-btn" style="width: 100%;">Use Optimized Prompt</button>
      </div>
    </div>
  `;
  shadow.appendChild(panel);

  // References to elements
  const textarea = shadow.getElementById('optimized-text');
  const diffView = shadow.getElementById('diff-view');
  const toggleEditBtn = shadow.getElementById('toggle-edit-btn');
  const changesList = shadow.getElementById('changes-list');
  const changesHeader = shadow.getElementById('changes-header');
  const toggleChangesLabel = shadow.getElementById('toggle-changes-label');

  // Event Listeners
  badge.addEventListener('click', () => {
    const isVisible = panel.classList.toggle('visible');
    container.classList.toggle('panel-open', isVisible);
  });
  
  shadow.getElementById('close-btn').addEventListener('click', () => {
    panel.classList.remove('visible');
    container.classList.remove('panel-open');
  });

  shadow.getElementById('optimize-btn').addEventListener('click', async () => {
    shadow.getElementById('loader').style.display = 'block';
    shadow.getElementById('result-section').style.display = 'none';
    shadow.getElementById('optimize-btn').disabled = true;
    
    try {
      await onOptimize();
    } catch (err) {
      console.error('onOptimize failed:', err);
    } finally {
      shadow.getElementById('loader').style.display = 'none';
      if (!isCooldownActive) {
        shadow.getElementById('optimize-btn').disabled = false;
      }
    }
  });

  // Toggle Edit/Diff view
  toggleEditBtn.addEventListener('click', () => {
    if (textarea.style.display === 'none') {
      textarea.value = diffView.textContent;
      textarea.style.display = 'block';
      diffView.style.display = 'none';
      toggleEditBtn.textContent = 'View Diff';
    } else {
      diffView.style.display = 'block';
      textarea.style.display = 'none';
      toggleEditBtn.textContent = 'Edit Text';
    }
  });

  // Toggle Changes details
  changesHeader.addEventListener('click', () => {
    changesList.classList.toggle('expanded');
    const isExpanded = changesList.classList.contains('expanded');
    toggleChangesLabel.textContent = isExpanded ? 'Hide' : 'Show';
  });

  shadow.getElementById('use-btn').addEventListener('click', () => {
    const finalPrompt = textarea.style.display === 'none' ? textarea.value : textarea.value;
    onUse(finalPrompt);
    panel.classList.remove('visible');
    container.classList.remove('panel-open');
  });

  // API exposed to inject.js
  return {
    container,
    toggleVisibility: () => {
      const isVisible = panel.classList.toggle('visible');
      container.classList.toggle('panel-open', isVisible);
    },
    updateScore: (scoreData) => {
      const dot = shadow.getElementById('score-dot');
      const text = shadow.getElementById('score-text');
      const missingList = shadow.getElementById('missing-list');
      
      text.textContent = `PromptIQ: ${scoreData.score}`;
      
      dot.className = 'score-dot';
      if (scoreData.score > 85) dot.className = 'score-dot score-excellent';
      else if (scoreData.score > 60) dot.className = 'score-dot score-good';
      else if (scoreData.score > 30) dot.className = 'score-dot score-fair';
      else if (scoreData.score > 0) dot.className = 'score-dot score-weak';

      if (scoreData.missing.length > 0) {
        missingList.innerHTML = scoreData.missing.map(m => `<span class="missing-tag">${m}</span>`).join('');
      } else {
        missingList.textContent = 'None! Excellent prompt.';
      }
    },
    showResult: (optimizedText, diffedTokens, explainedChanges) => {
      shadow.getElementById('result-section').style.display = 'block';
      
      // Set values
      textarea.value = optimizedText;
      
      // Render Diff HTML
      diffView.innerHTML = diffedTokens.map(tok => {
        if (tok.added) {
          return `<span class="diff-added">${tok.text}</span>`;
        }
        return tok.text;
      }).join('');

      // Render Changes with Icons & Labels
      changesList.innerHTML = explainedChanges.map(change => `
        <li class="change-item">
          <span class="change-icon">${change.icon}</span>
          <div class="change-content">
            <span class="change-label">${change.label}:</span>
            <span>${change.description}</span>
          </div>
        </li>
      `).join('');
      
      // Expand explanations by default on first load
      changesList.classList.add('expanded');
      toggleChangesLabel.textContent = 'Hide';
      
      // Default to showing diff view first
      diffView.style.display = 'block';
      textarea.style.display = 'none';
      toggleEditBtn.textContent = 'Edit Text';
    },
    showError: (err) => {
      shadow.getElementById('result-section').style.display = 'block';
      diffView.textContent = `Error: ${err.message}`;
      textarea.value = `Error: ${err.message}`;
      changesList.innerHTML = '';
      
      if (err.status === 429 || err.message.includes('429') || err.message.includes('quota')) {
        isCooldownActive = true;
        const match = err.message.match(/retry in ([\d\.]+)s/i);
        let seconds = match ? Math.ceil(parseFloat(match[1])) : 60;
        
        const optimizeBtn = shadow.getElementById('optimize-btn');
        optimizeBtn.disabled = true;
        optimizeBtn.textContent = `Retry in ${seconds}s`;
        
        const interval = setInterval(() => {
          seconds--;
          if (seconds <= 0) {
            clearInterval(interval);
            isCooldownActive = false;
            optimizeBtn.disabled = false;
            optimizeBtn.textContent = 'Optimize Prompt';
          } else {
            optimizeBtn.textContent = `Retry in ${seconds}s`;
          }
        }, 1000);
      }
    }
  };
}
