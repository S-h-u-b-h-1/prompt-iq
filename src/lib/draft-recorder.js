export function createDraftRecorder(save, delay = 2000) {
  let timer;
  let clientId;
  let revision = 0;
  return {
    reset() { clearTimeout(timer); clientId = null; revision = 0; },
    schedule(text, platform, mode) {
      clearTimeout(timer);
      if (!text.trim()) { clientId = null; revision = 0; return; }
      if (text.length > 6000) return;
      clientId ||= crypto.randomUUID();
      const entry = {kind:'draft',clientId,text,platform,mode,revision:++revision};
      timer = setTimeout(() => { Promise.resolve(save(entry)).catch(() => {}); }, delay);
    }
  };
}
