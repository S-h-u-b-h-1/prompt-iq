import { analyzeAndEnhancePrompt } from './src/lib/local-optimizer.js';
import { scorePrompt } from './src/lib/scorer.js';

const prompt = document.getElementById('demo-prompt');
const score = document.getElementById('demo-score');
const result = document.getElementById('demo-result');
const empty = document.getElementById('demo-empty');
const output = document.getElementById('demo-output');
const status = document.getElementById('demo-status');
const copy = document.getElementById('demo-copy');
let copyReset;
const GA_MEASUREMENT_ID = '__PROMPTIQ_GA_MEASUREMENT_ID__';

if (GA_MEASUREMENT_ID && /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID)) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

const trackGa = (eventType) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventType, { transport_type: 'beacon' });
  }
};

const refreshScore = () => {
  score.textContent = scorePrompt(prompt.value).score + ' / 100';
};
prompt.addEventListener('input', () => {
  refreshScore();
  result.hidden = true;
  empty.hidden = false;
  status.textContent = 'Your draft stays in this browser.';
});
refreshScore();

for (const id of ['demo-platform', 'demo-mode']) {
  document.getElementById(id).addEventListener('change', () => {
    result.hidden = true;
    empty.hidden = false;
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
  empty.hidden = true;
  status.textContent = 'Ready. Refined locally with Quick Rewrite.';
  copy.textContent = 'Copy prompt';
  track('website_demo_optimized');
  trackGa('website_demo_optimized');
});

copy.addEventListener('click', async () => {
  clearTimeout(copyReset);
  try {
    await navigator.clipboard.writeText(output.textContent);
    copy.textContent = 'Copied';
    track('website_demo_copied');
    trackGa('website_demo_copied');
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
  if (location.hostname !== 'promptiq-theta.vercel.app') return;
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
    link.addEventListener('click', () => {
      track('store_link_clicked');
      trackGa('store_link_clicked');
    });
  });
}

document.querySelectorAll('.contribution-link').forEach((button) => {
  button.addEventListener('click', () => {
    track('contribution_started');
    trackGa('contribution_started');
    window.location.href = button.dataset.upi;
  });
});

document.querySelectorAll('.copy-upi').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('shubhaang2201@axl');
      button.textContent = 'UPI ID copied';
      track('contribution_upi_copied');
      trackGa('contribution_upi_copied');
      window.setTimeout(() => { button.textContent = 'Copy UPI ID'; }, 1800);
    } catch {
      button.textContent = 'UPI: shubhaang2201@axl';
    }
  });
});
