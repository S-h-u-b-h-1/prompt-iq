/**
 * Per-site DOM detection and read/write for supported AI platforms.
 */

const PLATFORMS = [
  {
    id: 'chatgpt',
    matches: ['chatgpt.com', 'chat.openai.com'],
    composers: ['#prompt-textarea', 'textarea[data-id="root"]']
  },
  {
    id: 'claude',
    matches: ['claude.ai'],
    composers: [
      '[data-testid="chat-input"], [data-testid="chat-input"] [contenteditable="true"]',
      'div.ProseMirror[contenteditable="true"]'
    ]
  },
  {
    id: 'gemini',
    matches: ['gemini.google.com'],
    composers: [
      'rich-textarea .ql-editor[contenteditable="true"], .ql-editor[aria-label="Enter a prompt for Gemini"]',
      'rich-textarea [contenteditable="true"], rich-textarea textarea'
    ]
  },
  {
    id: 'perplexity',
    matches: ['www.perplexity.ai'],
    composers: ['[data-lexical-editor="true"][role="textbox"]', 'main textarea, form textarea']
  },
  {
    id: 'deepseek',
    matches: ['chat.deepseek.com'],
    composers: ['#chat-input', 'main textarea, textarea[placeholder*="DeepSeek" i]']
  },
  {
    id: 'grok',
    matches: ['grok.com'],
    composers: [
      '.query-bar-editor[contenteditable="true"], [aria-label="Message Grok"]',
      'main textarea, main [contenteditable="true"][role="textbox"]'
    ]
  },
  {
    id: 'mistral',
    matches: ['chat.mistral.ai'],
    composers: ['[data-testid="chat-input"], textarea[name="prompt"]', 'main textarea, main div.ProseMirror[contenteditable="true"]']
  },
  {
    id: 'meta',
    matches: ['meta.ai', 'www.meta.ai'],
    composers: ['main [contenteditable="true"][role="textbox"], main textarea, form textarea']
  },
  {
    id: 'poe',
    matches: ['poe.com'],
    composers: ['textarea[class*="ChatMessageInput"], textarea[class*="GrowingTextArea"]', 'main textarea, main [contenteditable="true"][role="textbox"]']
  },
  {
    id: 'you',
    matches: ['you.com'],
    composers: ['main textarea, main [contenteditable="true"][role="textbox"], form textarea']
  }
];

function isFormControl(el) {
  return el.tagName === 'TEXTAREA' || el.tagName === 'INPUT';
}

function isVisibleComposer(el) {
  if (!el?.isConnected || el.disabled || el.readOnly) return false;
  if (el.closest('dialog, [role="dialog"], [hidden], [inert], [aria-hidden="true"], nav, [role="search"]')) return false;
  if (el.matches('[aria-disabled="true"], [aria-readonly="true"]')) return false;
  if (!el.isContentEditable && !el.matches('textarea, input[type="text"], input[type="search"], input:not([type])')) return false;
  if (el.isContentEditable && el.parentElement?.isContentEditable) return false;

  const label = [el.getAttribute('aria-label'), el.getAttribute('placeholder')].filter(Boolean).join(' ');
  if (/\b(feedback|rename|search (?:chats|conversations|history|messages)|edit (?:this )?message)\b/i.test(label)) return false;

  const rect = el.getBoundingClientRect();
  return rect.width >= 110 && rect.height >= 20 && getComputedStyle(el).visibility === 'visible';
}

function getVisibleComposer(selectors, previous) {
  for (const selector of selectors) {
    const candidates = Array.from(document.querySelectorAll(selector)).filter(isVisibleComposer);
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      // Do not guess between multiple editors, such as a message edit and a new draft.
      return candidates.find((el) => el === document.activeElement) ??
        (candidates.includes(previous) ? previous : null);
    }
  }
  return null;
}

function getText(el) {
  if (!el) return '';
  return isFormControl(el) ? el.value : el.innerText || '';
}

function richTextLines(text) {
  // Browsers render empty block elements as extra newlines and use nbsp for spaces.
  return text.replace(/\u00a0/g, ' ').split('\n').filter((line) => line.trim()).join('\n');
}

const editorFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

async function setText(el, text, canWrite) {
  if (!isVisibleComposer(el) || typeof text !== 'string') return false;
  const value = text.replace(/\r\n?/g, '\n');
  if (el.tagName === 'INPUT' && value.includes('\n')) return false;
  if (getText(el) === value) return true;

  el.focus({ preventScroll: true });
  if (document.activeElement !== el) return false;

  let command = 'insertText';
  if (isFormControl(el)) {
    el.select();
  } else {
    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
    if (!value) command = 'delete';
  }

  const isLexical = el.matches('[data-lexical-editor="true"]');
  const isManagedEditor = isLexical || el.matches('.ProseMirror');
  if (isManagedEditor) {
    // Managed editors synchronize their own selection after Chromium publishes it.
    await editorFrame();
    const selection = window.getSelection();
    if (!isVisibleComposer(el) || !canWrite() || document.activeElement !== el ||
      !selection?.anchorNode || !el.contains(selection.anchorNode) || !el.contains(selection.focusNode)) return false;
  }
  if (isLexical) {
    if (value) {
      const transfer = new DataTransfer();
      transfer.setData('text/plain', value);
      const defaultAllowed = el.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: transfer, bubbles: true, cancelable: true, composed: true
      }));
      if (!defaultAllowed) {
        await editorFrame();
        return richTextLines(getText(el)) === richTextLines(value);
      }
    } else {
      document.execCommand('delete');
      await editorFrame();
      return !richTextLines(getText(el));
    }
  }

  // Chromium's native insertion keeps rich editors' input and undo state in sync.
  try {
    if (document.execCommand(command, false, value)) {
      if (isManagedEditor) await editorFrame();
      const inserted = getText(el);
      return isFormControl(el) ? inserted === value : richTextLines(inserted) === richTextLines(value);
    }
  } catch {
    // A plain input can still use the native value setter below.
  }

  if (!isFormControl(el)) return false;
  const prototype = el.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, value);
  el.setSelectionRange(value.length, value.length);
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
  return getText(el) === value;
}

export function getAdapter() {
  const platform = PLATFORMS.find(({ matches }) => matches.includes(location.hostname));
  if (!platform) return null;
  return {
    platform: platform.id,
    getInputElement: (previous) => getVisibleComposer(platform.composers, previous),
    getText,
    setText
  };
}
