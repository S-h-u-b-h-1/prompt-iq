import { setUserTier } from '../lib/storage.js';

export function createPanel(onOptimize, onUse, onFeedback, onLogout) {
  const container = document.createElement('div');
  container.id = 'promptiq-container';
  container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999999; font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;';
  
  let isCooldownActive = false;
  let currentRunId = null;
  let userTier = 'free';
  
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
      --pi-bg: #ffffff;
      --pi-card: #f8fafc;
      --pi-border: #e2e8f0;
      --pi-text: #0f172a;
      --pi-muted: #64748b;
      --pi-primary: #2563eb;
      --pi-success: #10b981;
      --pi-warning: #f59e0b;
      --pi-danger: #ef4444;
      --pi-glow: rgba(37, 99, 235, 0.08);
      --pi-shadow: rgba(0, 0, 0, 0.06);
      --pi-radius: 20px;
    }
    :host(.dark-mode) {
      --pi-bg: #0f172a;
      --pi-card: #1e293b;
      --pi-border: #334155;
      --pi-text: #f8fafc;
      --pi-muted: #94a3b8;
      --pi-primary: #3b82f6;
      --pi-success: #34d399;
      --pi-warning: #fbbf24;
      --pi-danger: #f87171;
      --pi-glow: rgba(59, 130, 246, 0.15);
      --pi-shadow: rgba(0, 0, 0, 0.35);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      border-radius: 9999px;
      background: var(--pi-bg);
      border: 1px solid var(--pi-border);
      color: var(--pi-text);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      user-select: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 25px -5px var(--pi-shadow);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 30px -5px var(--pi-shadow);
      border-color: var(--pi-primary);
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
      background: var(--pi-muted);
      transition: background 0.3s, box-shadow 0.3s;
    }
    .score-excellent { background: var(--pi-success); box-shadow: 0 0 10px var(--pi-success); }
    .score-good { background: var(--pi-warning); box-shadow: 0 0 10px var(--pi-warning); }
    .score-fair { background: #f97316; box-shadow: 0 0 10px #f97316; }
    .score-weak { background: var(--pi-danger); box-shadow: 0 0 10px var(--pi-danger); }
    
    .panel-wrapper {
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 24px;
      right: 24px;
      bottom: 24px;
      width: 390px;
      max-width: calc(100vw - 48px);
      background: var(--pi-bg);
      border: 1px solid var(--pi-border);
      border-radius: var(--pi-radius);
      box-shadow: 0 25px 50px -12px var(--pi-shadow);
      padding: 24px;
      color: var(--pi-text);
      box-sizing: border-box;
      z-index: 1000000;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      overflow: hidden;
      
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
      margin-bottom: 18px;
      border-bottom: 1px solid var(--pi-border);
      padding-bottom: 12px;
    }
    .header-logo-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .title { 
      font-weight: 800; 
      font-size: 17px; 
      color: var(--pi-text); 
      letter-spacing: -0.03em; 
    }
    .status-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 2.5px 8px;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }
    .status-free {
      background: rgba(100, 116, 139, 0.1);
      color: var(--pi-muted);
    }
    .status-pro {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15));
      color: var(--accent-purple);
      border: 1px solid rgba(139, 92, 246, 0.2);
    }
    
    .mode-selector-wrapper {
      margin-bottom: 18px;
    }
    .mode-selector-wrapper label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 6px;
      color: var(--pi-muted);
      letter-spacing: 0.05em;
    }
    .mode-selector-wrapper select {
      width: 100%;
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid var(--pi-border);
      background: var(--pi-card);
      color: var(--pi-text);
      font-size: 13px;
      font-weight: 600;
      outline: none;
      transition: all 0.2s;
      cursor: pointer;
    }
    .mode-selector-wrapper select:focus {
      border-color: var(--pi-primary);
      box-shadow: 0 0 0 3px var(--pi-glow);
    }

    /* Visual Score Progress Area */
    .score-area {
      background: var(--pi-card);
      border: 1px solid var(--pi-border);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .score-ring-container {
      position: relative;
      width: 56px;
      height: 56px;
      flex-shrink: 0;
    }
    .score-ring {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .score-ring-bg {
      fill: none;
      stroke: var(--pi-border);
      stroke-width: 4;
    }
    .score-ring-progress {
      fill: none;
      stroke: var(--pi-muted);
      stroke-width: 4;
      stroke-linecap: round;
      transition: stroke-dasharray 0.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease;
    }
    .score-ring-val {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 15px;
      font-weight: 800;
      color: var(--pi-text);
    }
    .score-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .score-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--pi-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .score-grade {
      font-size: 16px;
      font-weight: 800;
      color: var(--pi-text);
    }

    /* Dimension Chips */
    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 18px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }
    .chip-present {
      background: rgba(16, 185, 129, 0.06);
      color: var(--pi-success);
      border-color: rgba(16, 185, 129, 0.12);
    }
    .chip-missing {
      background: rgba(100, 116, 139, 0.05);
      color: var(--pi-muted);
      border-color: var(--pi-border);
      opacity: 0.65;
    }

    .btn {
      padding: 10px 18px;
      border-radius: 12px;
      border: 1px solid transparent;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: var(--pi-primary);
      color: white;
      box-shadow: 0 4px 12px var(--pi-glow);
    }
    .btn-primary:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px var(--pi-glow);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      transform: none;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: var(--pi-card);
      color: var(--pi-text);
      border-color: var(--pi-border);
    }
    .btn-secondary:hover {
      background: var(--pi-border);
    }
    
    .result-section {
      display: none;
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid var(--pi-border);
      overflow-y: auto;
      flex: 1;
    }
    
    /* Mock Editor Window */
    .editor-card {
      border: 1px solid var(--pi-border);
      border-radius: 16px;
      background: var(--pi-card);
      overflow: hidden;
      margin-bottom: 14px;
      box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.03);
    }
    .editor-header {
      background: rgba(15, 23, 42, 0.03);
      padding: 10px 16px;
      border-bottom: 1px solid var(--pi-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .editor-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--pi-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .optimized-textarea {
      width: 100%;
      height: 150px;
      font-size: 13px;
      line-height: 1.55;
      background: transparent;
      border: none;
      padding: 14px;
      resize: vertical;
      font-family: inherit;
      color: var(--pi-text);
      box-sizing: border-box;
    }
    .optimized-textarea:focus {
      outline: none;
    }

    .diff-view {
      font-size: 13px;
      line-height: 1.55;
      background: transparent;
      border: none;
      padding: 14px;
      max-height: 150px;
      overflow-y: auto;
      margin: 0;
      white-space: pre-wrap;
      color: var(--pi-text);
      box-sizing: border-box;
    }
    .diff-added {
      background: rgba(16, 185, 129, 0.15);
      color: var(--pi-success);
      font-weight: 600;
      padding: 2px 4px;
      border-radius: 4px;
    }

    .changes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      cursor: pointer;
      user-select: none;
    }
    .changes-title {
      font-weight: 700;
      font-size: 13px;
      color: var(--pi-text);
    }
    
    .changes-list {
      font-size: 12px;
      list-style: none;
      padding: 0;
      margin: 0 0 18px 0;
      max-height: 150px;
      overflow-y: auto;
      display: none;
    }
    .changes-list.expanded {
      display: block;
    }
    .change-item {
      display: flex;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid var(--pi-border);
    }
    .change-icon {
      font-size: 14px;
      flex-shrink: 0;
    }
    .change-content {
      line-height: 1.45;
    }
    .change-label {
      font-weight: 700;
      color: var(--pi-text);
    }
    
    /* Loading Shimmer State */
    .loader-shimmer {
      display: none;
      background: var(--pi-card);
      border: 1px solid var(--pi-border);
      border-radius: 16px;
      padding: 20px;
      position: relative;
      overflow: hidden;
      margin-top: 18px;
    }
    .shimmer-line {
      height: 11px;
      background: var(--pi-border);
      margin-bottom: 12px;
      border-radius: 4px;
      position: relative;
      overflow: hidden;
    }
    .shimmer-line::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transform: translateX(-100%);
      animation: shimmer 1.5s infinite;
    }
    :host(.dark-mode) .shimmer-line::after {
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
    }
    .shimmer-t { width: 35%; height: 13px; }
    .shimmer-l1 { width: 85%; }
    .shimmer-l2 { width: 95%; }
    .shimmer-l3 { width: 70%; }
    .shimmer-label {
      display: block;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      color: var(--pi-muted);
      margin-top: 8px;
      letter-spacing: 0.02em;
    }
    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }
    
    /* Paywall Overlay */
    .paywall-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
      z-index: 1000010;
      padding: 20px;
      box-sizing: border-box;
    }
    .paywall-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .paywall-card {
      background: var(--pi-bg);
      border: 1px solid var(--pi-border);
      border-radius: 20px;
      padding: 28px;
      text-align: center;
      max-width: 320px;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4);
      box-sizing: border-box;
    }
    .paywall-icon {
      font-size: 36px;
      margin-bottom: 12px;
    }
    .paywall-title {
      font-weight: 800;
      font-size: 18px;
      margin-bottom: 8px;
      color: var(--pi-text);
      letter-spacing: -0.02em;
    }
    .paywall-desc {
      font-size: 12.5px;
      color: var(--pi-muted);
      margin-bottom: 20px;
      line-height: 1.5;
    }
    
    /* Feedback Section */
    .feedback-section {
      background: var(--pi-card);
      border: 1px solid var(--pi-border);
      border-radius: 12px;
      padding: 14px;
      text-align: center;
      margin-top: 14px;
      margin-bottom: 14px;
    }
    .feedback-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--pi-text);
      display: block;
      margin-bottom: 10px;
    }
    .feedback-buttons {
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    .feedback-btn {
      background: var(--pi-bg);
      border: 1px solid var(--pi-border);
      color: var(--pi-text);
      font-size: 12.5px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .feedback-btn:hover {
      background: var(--pi-border);
      transform: translateY(-1px);
    }
    .feedback-thanks {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--pi-success);
      display: none;
      margin-top: 4px;
    }

    /* Error and Authentication states */
    .error-panel {
      display: none;
      background: rgba(239, 68, 68, 0.04);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin-top: 18px;
    }
    .error-icon {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .error-title {
      font-weight: 800;
      font-size: 14px;
      color: var(--pi-danger);
      margin-bottom: 6px;
    }
    .error-message {
      font-size: 12px;
      color: var(--pi-text);
      line-height: 1.5;
    }
  `;
  shadow.appendChild(style);
 
  // Floating Badge (closed state overlay)
  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.innerHTML = `<div class="score-dot" id="score-dot"></div><span id="score-text">PromptIQ: 0</span>`;
  shadow.appendChild(badge);

  // Main Panel Wrapper
  const panel = document.createElement('div');
  panel.className = 'panel-wrapper';
  panel.innerHTML = `
    <div class="header">
      <div class="header-logo-group">
        <div class="title">PromptIQ Optimizer</div>
        <div class="status-badge status-free" id="header-pro-badge">FREE</div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="btn btn-secondary" id="logout-sidebar-btn" style="padding: 4px 8px; font-size: 10px; background: rgba(239, 68, 68, 0.08); color: var(--pi-danger); border-color: rgba(239, 68, 68, 0.12); display: none;">Log Out</button>
        <button class="btn btn-secondary" id="close-btn" style="padding: 6px 12px; font-size: 11px;">Close</button>
      </div>
    </div>
    
    <!-- Mode Selector -->
    <div class="mode-selector-wrapper">
      <label for="mode-select">Optimization Mode</label>
      <select id="mode-select">
        <option value="turbo">⚡ Turbo (Free)</option>
        <option value="professional">🔒 Professional (Pro)</option>
        <option value="research">🔒 Research (Pro)</option>
        <option value="creative">🔒 Creative (Pro)</option>
        <option value="coding">🔒 Coding (Pro)</option>
        <option value="business">🔒 Business (Pro)</option>
      </select>
    </div>

    <!-- Visual Score Circle & Info -->
    <div class="score-area">
      <div class="score-ring-container">
        <svg class="score-ring" viewBox="0 0 36 36">
          <path class="score-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path class="score-ring-progress" id="score-ring-bar" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <div class="score-ring-val" id="score-ring-val">0</div>
      </div>
      <div class="score-info">
        <div class="score-label">Draft Quality</div>
        <div class="score-grade" id="score-grade">Empty</div>
      </div>
    </div>

    <!-- Dimension Chips -->
    <div class="chips-container" id="chips-container">
      <div class="chip chip-missing" data-dimension="task"><span class="chip-icon">✗</span> Task</div>
      <div class="chip chip-missing" data-dimension="context"><span class="chip-icon">✗</span> Context</div>
      <div class="chip chip-missing" data-dimension="role"><span class="chip-icon">✗</span> Role</div>
      <div class="chip chip-missing" data-dimension="format"><span class="chip-icon">✗</span> Format</div>
      <div class="chip chip-missing" data-dimension="constraints"><span class="chip-icon">✗</span> Constraints</div>
      <div class="chip chip-missing" data-dimension="specificity"><span class="chip-icon">✗</span> Specificity</div>
    </div>
    
    <button class="btn btn-primary" id="optimize-btn" style="width: 100%;">Optimize Prompt</button>
    
    <!-- Shimmer Loader State -->
    <div class="loader-shimmer" id="loader-shimmer">
      <div class="shimmer-line shimmer-t"></div>
      <div class="shimmer-line shimmer-l1"></div>
      <div class="shimmer-line shimmer-l2"></div>
      <div class="shimmer-line shimmer-l3"></div>
      <span class="shimmer-label">Optimizing your prompt...</span>
    </div>

    <!-- Error/Auth card panel -->
    <div class="error-panel" id="error-panel">
      <div class="error-icon" id="error-panel-icon">⚠️</div>
      <div class="error-title" id="error-panel-title">Optimization Failed</div>
      <div class="error-message" id="error-panel-message">Please try refreshing the page.</div>
    </div>
    
    <!-- Paywall Overlay -->
    <div class="paywall-overlay" id="paywall-overlay">
      <div class="paywall-card">
        <div class="paywall-icon" id="paywall-icon">💎</div>
        <div class="paywall-title" id="paywall-title">Unlock PromptIQ Pro</div>
        <div class="paywall-desc" id="paywall-desc">Unlock advanced modes and unlimited daily optimizations.</div>
        <button class="btn btn-primary" id="paywall-upgrade-btn" style="width: 100%;">Upgrade for ₹99/mo</button>
        <button class="btn btn-secondary" id="paywall-close-btn" style="width: 100%; margin-top: 8px;">Back</button>
      </div>
    </div>
    
    <!-- Result Editor Area -->
    <div class="result-section" id="result-section">
      <div class="editor-card">
        <div class="editor-header">
          <span class="editor-title" id="editor-view-title">Optimized Draft</span>
          <button class="btn btn-secondary" id="toggle-edit-btn" style="padding: 4px 10px; font-size: 11px;">Edit Text</button>
        </div>
        <div class="diff-view" id="diff-view"></div>
        <textarea class="optimized-textarea" id="optimized-text" style="display: none;"></textarea>
      </div>
      
      <div class="changes-header" id="changes-header">
        <span class="changes-title">🔍 Changes Explained</span>
        <span style="font-size: 12px; color: var(--pi-primary); font-weight: 700;" id="toggle-changes-label">Hide</span>
      </div>
      <ul class="changes-list" id="changes-list"></ul>
      
      <!-- Feedback Loop Panel -->
      <div class="feedback-section" id="feedback-section">
        <span class="feedback-title">Was this optimization useful?</span>
        <div class="feedback-buttons" id="feedback-buttons-wrapper">
          <button class="feedback-btn" id="feedback-yes">👍 Yes</button>
          <button class="feedback-btn" id="feedback-no">👎 No</button>
        </div>
        <div class="feedback-thanks" id="feedback-thanks">Thank you! Your feedback helps us improve.</div>
      </div>
      
      <button class="btn btn-primary" id="use-btn" style="width: 100%;">Use Optimized Prompt</button>
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
  const modeSelect = shadow.getElementById('mode-select');
  const paywallOverlay = shadow.getElementById('paywall-overlay');
  const optimizeBtn = shadow.getElementById('optimize-btn');
  const loaderShimmer = shadow.getElementById('loader-shimmer');
  const errorPanel = shadow.getElementById('error-panel');
  
  // Event Listeners
  badge.addEventListener('click', () => {
    const isVisible = panel.classList.toggle('visible');
    container.classList.toggle('panel-open', isVisible);
  });
  
  shadow.getElementById('close-btn').addEventListener('click', () => {
    panel.classList.remove('visible');
    container.classList.remove('panel-open');
  });

  const logoutSidebarBtn = shadow.getElementById('logout-sidebar-btn');
  logoutSidebarBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to log out of PromptIQ?')) {
      onLogout();
    }
  });

  optimizeBtn.addEventListener('click', async () => {
    loaderShimmer.style.display = 'block';
    errorPanel.style.display = 'none';
    shadow.getElementById('result-section').style.display = 'none';
    optimizeBtn.disabled = true;
    
    try {
      await onOptimize();
    } catch (err) {
      console.error('onOptimize failed:', err);
    } finally {
      loaderShimmer.style.display = 'none';
      if (!isCooldownActive) {
        optimizeBtn.disabled = false;
      }
    }
  });

  // Mode select logic for Free users: Immediately show paywall
  modeSelect.addEventListener('change', () => {
    const selectedMode = modeSelect.value;
    if (selectedMode !== 'turbo' && userTier === 'free') {
      // Revert select back to turbo
      modeSelect.value = 'turbo';
      // Open paywall
      api.showPaywall('mode');
    }
  });

  // Toggle Edit/Diff view
  toggleEditBtn.addEventListener('click', () => {
    const viewTitle = shadow.getElementById('editor-view-title');
    if (textarea.style.display === 'none') {
      textarea.value = diffView.textContent;
      textarea.style.display = 'block';
      diffView.style.display = 'none';
      toggleEditBtn.textContent = 'View Diff';
      viewTitle.textContent = 'Edit Mode';
    } else {
      diffView.style.display = 'block';
      textarea.style.display = 'none';
      toggleEditBtn.textContent = 'Edit Text';
      viewTitle.textContent = 'Optimized Draft';
    }
  });

  // Toggle Changes details
  changesHeader.addEventListener('click', () => {
    changesList.classList.toggle('expanded');
    const isExpanded = changesList.classList.contains('expanded');
    toggleChangesLabel.textContent = isExpanded ? 'Hide' : 'Show';
  });

  shadow.getElementById('use-btn').addEventListener('click', () => {
    const finalPrompt = textarea.style.display === 'none' ? diffView.textContent : textarea.value;
    onUse(finalPrompt);
    panel.classList.remove('visible');
    container.classList.remove('panel-open');
  });

  // Paywall Actions
  shadow.getElementById('paywall-close-btn').addEventListener('click', () => {
    paywallOverlay.classList.remove('active');
  });

  shadow.getElementById('paywall-upgrade-btn').addEventListener('click', async () => {
    await setUserTier('pro');
    
    shadow.getElementById('paywall-title').textContent = "Unlocked! 🎉";
    shadow.getElementById('paywall-desc').textContent = "PromptIQ Pro tier is now active! Try optimizing your prompt again.";
    shadow.getElementById('paywall-upgrade-btn').style.display = 'none';
    shadow.getElementById('paywall-close-btn').style.display = 'none';
    shadow.getElementById('paywall-icon').textContent = "🚀";
    
    // Set UI state to pro
    api.setTier('pro');
    
    setTimeout(() => {
      paywallOverlay.classList.remove('active');
      // Restore buttons for next time
      shadow.getElementById('paywall-upgrade-btn').style.display = 'block';
      shadow.getElementById('paywall-close-btn').style.display = 'block';
      shadow.getElementById('paywall-icon').textContent = "💎";
      shadow.getElementById('paywall-title').textContent = "Unlock PromptIQ Pro";
      shadow.getElementById('paywall-desc').textContent = "Unlock advanced modes and unlimited daily optimizations.";
    }, 2000);
  });

  // Feedback Event Listeners
  shadow.getElementById('feedback-yes').addEventListener('click', async () => {
    if (onFeedback && currentRunId) {
      await onFeedback(currentRunId, 'helpful');
      shadow.getElementById('feedback-buttons-wrapper').style.display = 'none';
      shadow.getElementById('feedback-thanks').style.display = 'block';
    }
  });

  shadow.getElementById('feedback-no').addEventListener('click', async () => {
    if (onFeedback && currentRunId) {
      await onFeedback(currentRunId, 'unhelpful');
      shadow.getElementById('feedback-buttons-wrapper').style.display = 'none';
      shadow.getElementById('feedback-thanks').style.display = 'block';
    }
  });

  const api = {
    container,
    setLoggedState: (isLoggedIn) => {
      logoutSidebarBtn.style.display = isLoggedIn ? 'block' : 'none';
    },
    toggleVisibility: () => {
      const isVisible = panel.classList.toggle('visible');
      container.classList.toggle('panel-open', isVisible);
    },
    getMode: () => {
      return modeSelect.value;
    },
    setTier: (tier) => {
      userTier = tier;
      const proBadge = shadow.getElementById('header-pro-badge');
      
      if (tier === 'pro') {
        proBadge.textContent = 'PRO';
        proBadge.className = 'status-badge status-pro';
        
        // Remove lock icons from mode selector
        modeSelect.options[1].text = '💎 Professional';
        modeSelect.options[2].text = '📚 Research';
        modeSelect.options[3].text = '🎨 Creative';
        modeSelect.options[4].text = '💻 Coding';
        modeSelect.options[5].text = '💼 Business';
      } else {
        proBadge.textContent = 'FREE';
        proBadge.className = 'status-badge status-free';
        
        // Add lock icons to mode selector
        modeSelect.options[1].text = '🔒 Professional (Pro)';
        modeSelect.options[2].text = '🔒 Research (Pro)';
        modeSelect.options[3].text = '🔒 Creative (Pro)';
        modeSelect.options[4].text = '🔒 Coding (Pro)';
        modeSelect.options[5].text = '🔒 Business (Pro)';
      }
    },
    showPaywall: (type) => {
      loaderShimmer.style.display = 'none';
      optimizeBtn.disabled = false;
      
      const titleEl = shadow.getElementById('paywall-title');
      const descEl = shadow.getElementById('paywall-desc');
      
      if (type === 'limit') {
        titleEl.textContent = "Daily Limit Reached";
        descEl.textContent = "Unlock unlimited optimizations and advanced rewrite modes. Upgrade to PromptIQ Pro for only ₹99/mo!";
      } else if (type === 'mode') {
        titleEl.textContent = "Pro Mode Locked";
        const selectedModeText = modeSelect.options[modeSelect.selectedIndex].text.replace('🔒 ', '').split(' (')[0];
        descEl.textContent = `The ${selectedModeText} mode is locked. Unlock advanced rewrite modes and unlimited optimizations with PromptIQ Pro!`;
      }
      
      paywallOverlay.classList.add('active');
    },
    updateScore: (scoreData) => {
      const dot = shadow.getElementById('score-dot');
      const text = shadow.getElementById('score-text');
      
      // Update circular score progress
      const circleProgress = shadow.getElementById('score-ring-bar');
      const scoreValEl = shadow.getElementById('score-ring-val');
      const scoreGradeEl = shadow.getElementById('score-grade');
      
      const score = Math.max(0, Math.min(100, scoreData.score || 0));
      scoreValEl.textContent = score;
      scoreGradeEl.textContent = scoreData.grade || 'Empty';
      
      text.textContent = `PromptIQ: ${score}`;
      
      // Calculate circle circumference (2 * pi * r = 2 * 3.14159 * 15.9155 = 100)
      // So dasharray is directly the score value!
      circleProgress.setAttribute('stroke-dasharray', `${score}, 100`);
      
      // Set color themes
      dot.className = 'score-dot';
      circleProgress.style.stroke = 'var(--pi-muted)';
      scoreGradeEl.style.color = 'var(--pi-text)';
      
      let scoreThemeClass = '';
      let scoreThemeStroke = 'var(--pi-muted)';
      
      if (score > 85) {
        scoreThemeClass = 'score-excellent';
        scoreThemeStroke = 'var(--pi-success)';
        scoreGradeEl.style.color = 'var(--pi-success)';
      } else if (score > 60) {
        scoreThemeClass = 'score-good';
        scoreThemeStroke = 'var(--pi-warning)';
        scoreGradeEl.style.color = 'var(--pi-warning)';
      } else if (score > 30) {
        scoreThemeClass = 'score-fair';
        scoreThemeStroke = '#f97316';
        scoreGradeEl.style.color = '#f97316';
      } else if (score > 0) {
        scoreThemeClass = 'score-weak';
        scoreThemeStroke = 'var(--pi-danger)';
        scoreGradeEl.style.color = 'var(--pi-danger)';
      }
      
      if (scoreThemeClass) dot.classList.add(scoreThemeClass);
      circleProgress.style.stroke = scoreThemeStroke;

      // Update dimension chips
      const chips = shadow.querySelectorAll('.chip');
      chips.forEach(chip => {
        const dim = chip.getAttribute('data-dimension');
        const isMissing = scoreData.missing && scoreData.missing.includes(dim);
        if (isMissing) {
          chip.className = 'chip chip-missing';
          chip.innerHTML = `<span class="chip-icon">✗</span> ${dim.charAt(0).toUpperCase() + dim.slice(1)}`;
        } else {
          chip.className = 'chip chip-present';
          chip.innerHTML = `<span class="chip-icon">✓</span> ${dim.charAt(0).toUpperCase() + dim.slice(1)}`;
        }
      });
    },
    showResult: (optimizedText, diffedTokens, explainedChanges, runId) => {
      currentRunId = runId;
      errorPanel.style.display = 'none';
      shadow.getElementById('result-section').style.display = 'block';
      
      // Reset feedback display
      shadow.getElementById('feedback-buttons-wrapper').style.display = 'flex';
      shadow.getElementById('feedback-thanks').style.display = 'none';

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
      shadow.getElementById('editor-view-title').textContent = 'Optimized Draft';
    },
    showError: (err) => {
      loaderShimmer.style.display = 'none';
      optimizeBtn.disabled = false;
      shadow.getElementById('result-section').style.display = 'none';
      
      const errorIcon = shadow.getElementById('error-panel-icon');
      const errorTitle = shadow.getElementById('error-panel-title');
      const errorMessage = shadow.getElementById('error-panel-message');
      
      if (err.status === 401 || err.message.toLowerCase().includes('log in') || err.message.toLowerCase().includes('session')) {
        errorIcon.textContent = '🔑';
        errorTitle.textContent = 'Authentication Required';
        errorMessage.innerHTML = `Please log in to your PromptIQ account.<br><span style="font-size: 11.5px; opacity: 0.85; margin-top: 8px; display: block; font-weight: 500;">Click the extension icon (🧩) in your browser toolbar to log in.</span>`;
      } else {
        errorIcon.textContent = '⚠️';
        errorTitle.textContent = 'Optimization Failed';
        errorMessage.textContent = err.message || 'Please try refreshing the page or try again.';
      }
      
      errorPanel.style.display = 'block';
      
      if (err.status === 429 || err.message.includes('429') || err.message.includes('quota')) {
        isCooldownActive = true;
        const match = err.message.match(/retry in ([\d\.]+)s/i);
        let seconds = match ? Math.ceil(parseFloat(match[1])) : 60;
        
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

  return api;
}
