import { getSessionToken } from './storage.js';
const BASE = 'https://promptiq-theta.vercel.app/api/history';
export const DISCLOSURE_VERSION = '2026-09-13-v2';
const OFF = {saveDrafts:false,saveSearches:false,disclosureVersion:DISCLOSURE_VERSION};
let cached = null;

async function request(action, method='GET', body, expectedToken=null) {
  const token = await getSessionToken();
  if (!token || (expectedToken && token !== expectedToken)) throw new Error('Sign in to save activity to your account.');
  const response = await fetch(BASE + '?action=' + action, {
    method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    ...(body ? {body:JSON.stringify(body)} : {}),
    signal:AbortSignal.timeout(10000)
  });
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || 'Saved activity is unavailable.');
  return data;
}
export async function getCapturePreferences(force=false) {
  const token=await getSessionToken();
  if(!token) {cached=null;return {...OFF};}
  if(!force && cached?.token===token && Date.now()-cached.time<15000) return cached.value;
  const value=await request('preferences','GET',null,token);
  cached={token,time:Date.now(),value};
  return value;
}
export async function setCapturePreferences(value) {
  const token=await getSessionToken();
  const saved=await request('preferences','POST',{...value,disclosureVersion:DISCLOSURE_VERSION},token);
  cached={token,time:Date.now(),value:saved};
  try {
    if (globalThis.chrome?.runtime?.id && chrome.storage?.local) {
      await chrome.storage.local.set({promptIqCapturePreferencesVersion:Date.now()});
    }
  } catch {
    // Content scripts also refresh access whenever the popup changes this marker.
  }
  return saved;
}
export async function saveActivity(entry) {
  try {
    const token=await getSessionToken();
    if(!token) return {saved:false};
    const preferences=await getCapturePreferences();
    if(!(entry.kind==='draft'?preferences.saveDrafts:preferences.saveSearches)) return {saved:false};
    return await request('activity','POST',entry,token);
  } catch { return {saved:false}; }
}
export async function getSavedActivity(offset=0) { return request('activity&offset='+offset); }
export async function clearSavedActivity() {
  const result=await request('activity','DELETE');
  cached=null;
  return result;
}
