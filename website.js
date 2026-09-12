import { analyzeAndEnhancePrompt } from './src/lib/local-optimizer.js';
import { scorePrompt } from './src/lib/scorer.js';

const prompt = document.getElementById('demo-prompt');
const score = document.getElementById('demo-score');
const result = document.getElementById('demo-result');
const output = document.getElementById('demo-output');
const status = document.getElementById('demo-status');
const copy = document.getElementById('demo-copy');
let copyReset;

const refreshScore = () => {
  score.textContent = scorePrompt(prompt.value).score + ' / 100';
};
prompt.addEventListener('input', () => {
  refreshScore();
  result.hidden = true;
  status.textContent = 'Your draft stays in this browser.';
});
refreshScore();

for (const id of ['demo-platform', 'demo-mode']) {
  document.getElementById(id).addEventListener('change', () => {
    result.hidden = true;
    status.textContent = 'Your draft stays in this browser.';
  });
}

document.getElementById('demo-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!prompt.value.trim()) {
    status.textContent = 'Add a draft to get started.';
    prompt.focus();
    return;
  }
  const optimized = analyzeAndEnhancePrompt(prompt.value, {
    platform: document.getElementById('demo-platform').value,
    mode: document.getElementById('demo-mode').value
  });
  output.textContent = optimized.enhancedPrompt;
  result.hidden = false;
  status.textContent = 'Ready. Refined locally with Smart Template.';
  copy.textContent = 'Copy prompt';
});

copy.addEventListener('click', async () => {
  clearTimeout(copyReset);
  try {
    await navigator.clipboard.writeText(output.textContent);
    copy.textContent = 'Copied';
  } catch {
    copy.textContent = 'Copy unavailable';
    status.textContent = 'Select the refined prompt to copy it.';
  }
  copyReset = setTimeout(() => { copy.textContent = 'Copy prompt'; }, 2000);
});

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('pending');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.08 });
  document.querySelectorAll('.band .wrap, .proof-grid').forEach((element) => {
    element.classList.add('reveal', 'pending');
    observer.observe(element);
  });
}

const track = (eventType) => {
  fetch('/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: eventType }),
    keepalive: true
  }).catch(() => {});
};
if (location.hostname === 'promptiq-theta.vercel.app') {
  track('website_viewed');
  document.querySelectorAll('.store-link').forEach((link) => {
    link.addEventListener('click', () => track('store_link_clicked'));
  });
}
