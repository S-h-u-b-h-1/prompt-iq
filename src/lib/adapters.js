/**
 * Per-site DOM detection and read/write for supported AI platforms.
 */

const PLATFORMS = [
  {
    id: 'chatgpt',
    matches: ['chatgpt.com', 'chat.openai.com'],
    selector: '#prompt-textarea, textarea[data-id="root"]',
    isContentEditable: false
  },
  {
    id: 'claude',
    matches: ['claude.ai'],
    selector: 'div.ProseMirror[contenteditable="true"], div.ProseMirror',
    isContentEditable: true
  },
  {
    id: 'gemini',
    matches: ['gemini.google.com'],
    selector: 'rich-textarea div[contenteditable="true"], .ql-editor[contenteditable="true"], rich-textarea textarea, .text-input-field',
    isContentEditable: true
  },
  {
    id: 'perplexity',
    matches: ['www.perplexity.ai'],
    selector: 'textarea, [data-lexical-editor="true"][contenteditable="true"]',
    isContentEditable: false
  },
  {
    id: 'copilot',
    matches: ['copilot.microsoft.com'],
    selector: '#searchbox, textarea, [contenteditable="true"][role="textbox"]',
    isContentEditable: false
  },
  {
    id: 'deepseek',
    matches: ['chat.deepseek.com'],
    selector: '#chat-input, textarea, [contenteditable="true"][role="textbox"]',
    isContentEditable: false
  },
  {
    id: 'grok',
    matches: ['grok.com'],
    selector: 'textarea, [contenteditable="true"][role="textbox"]',
    isContentEditable: false
  },
  {
    id: 'mistral',
    matches: ['chat.mistral.ai'],
    selector: 'textarea, div.ProseMirror[contenteditable="true"], [contenteditable="true"][role="textbox"]',
    isContentEditable: false
  },
  {
    id: 'meta',
    matches: ['meta.ai', 'www.meta.ai'],
    selector: '[contenteditable="true"][role="textbox"], textarea',
    isContentEditable: false
  },
  {
    id: 'poe',
    matches: ['poe.com'],
    selector: 'textarea, [contenteditable="true"][role="textbox"], div.ProseMirror[contenteditable="true"]',
    isContentEditable: false
  },
  {
    id: 'you',
    matches: ['you.com'],
    selector: 'textarea, [contenteditable="true"][role="textbox"]',
    isContentEditable: false
  }
];

function matchesHostname(hostname, expected) {
  return hostname === expected || hostname.endsWith(`.${expected}`);
}

function getVisibleComposer(selector) {
  const candidates = selector
    .split(',')
    .flatMap((part) => [...document.querySelectorAll(part.trim())])
    .filter((element, index, all) => all.indexOf(element) === index)
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width >= 120 && rect.height >= 24 && style.display !== 'none' && style.visibility !== 'hidden';
    });

  return candidates.sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();
    return (bRect.bottom - aRect.bottom) || ((bRect.width * bRect.height) - (aRect.width * aRect.height));
  })[0] || null;
}

export function getAdapter() {
  const hostname = window.location.hostname;
  const platform = PLATFORMS.find((item) => item.matches.some((match) => matchesHostname(hostname, match)));
  
  if (!platform) return null;

  return {
    platform: platform.id,
    
    getInputElement: () => {
      return getVisibleComposer(platform.selector);
    },

    getText: (el) => {
      if (!el) return '';
      const isInputOrTextarea = el.tagName === 'TEXTAREA' || el.tagName === 'INPUT';
      return isInputOrTextarea ? (el.value || '') : (el.innerText || '');
    },

    setText: (el, text) => {
      if (!el) return;
      
      el.focus();

      const isInputOrTextarea = el.tagName === 'TEXTAREA' || el.tagName === 'INPUT';

      // Select all content to replace it
      if (!isInputOrTextarea) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        el.select();
      }

      // Execute browser command to insert/replace text
      // This is the only way to natively update ProseMirror (Claude) & React (ChatGPT) states
      let success = false;
      try {
        success = document.execCommand('insertText', false, text);
      } catch (err) {
        console.error('execCommand failed:', err);
      }

      // Fallback if execCommand fails
      if (!success) {
        if (!isInputOrTextarea) {
          el.innerText = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          const prototype = el.tagName === 'INPUT'
            ? window.HTMLInputElement.prototype
            : window.HTMLTextAreaElement.prototype;
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            prototype,
            'value'
          )?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(el, text);
          } else {
            el.value = text;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  };
}
