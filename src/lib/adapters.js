/**
 * Per-site DOM detection and read/write for 7 AI platforms.
 */

const PLATFORMS = [
  {
    id: 'chatgpt',
    matches: ['chatgpt.com', 'chat.openai.com'],
    selector: '#prompt-textarea',
    isContentEditable: false
  },
  {
    id: 'claude',
    matches: ['claude.ai'],
    selector: 'div.ProseMirror',
    isContentEditable: true
  },
  {
    id: 'gemini',
    matches: ['gemini.google.com'],
    selector: 'rich-textarea p, .ql-editor p, rich-textarea, .text-input-field',
    isContentEditable: true
  },
  {
    id: 'perplexity',
    matches: ['www.perplexity.ai'],
    selector: 'textarea',
    isContentEditable: false
  },
  {
    id: 'copilot',
    matches: ['copilot.microsoft.com'],
    selector: '#searchbox, textarea',
    isContentEditable: false
  },
  {
    id: 'deepseek',
    matches: ['chat.deepseek.com'],
    selector: '#chat-input, textarea',
    isContentEditable: false
  }
];

export function getAdapter() {
  const hostname = window.location.hostname;
  const platform = PLATFORMS.find(p => p.matches.some(m => hostname.includes(m)));
  
  if (!platform) return null;

  return {
    platform: platform.id,
    
    getInputElement: () => {
      // Find the input element based on platform selectors
      const selectors = platform.selector.split(',').map(s => s.trim());
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }
      return null;
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
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
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
