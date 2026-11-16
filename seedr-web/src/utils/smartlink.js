import { SMARTLINK_AD } from "./adConfig";

const STORAGE_KEY = "adSmartlinkLastOpened";
let lastOpenedInMemory = 0; // fallback when localStorage is unavailable

function getLastOpened() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || lastOpenedInMemory;
  } catch {
    return lastOpenedInMemory;
  }
}

function setLastOpened(ts) {
  lastOpenedInMemory = ts;
  try {
    localStorage.setItem(STORAGE_KEY, String(ts));
  } catch {
    // private mode / storage blocked — in-memory value still applies
  }
}

// Open the Smartlink in a new tab, respecting the cooldown. Must be called
// synchronously inside a user click, or the browser's popup blocker stops it.
// Returns true if a tab was opened.
export function openSmartlink() {
  const { url, cooldownMinutes } = SMARTLINK_AD;
  if (!url) return false;

  const now = Date.now();
  if (now - getLastOpened() < cooldownMinutes * 60 * 1000) return false;

  const win = window.open(url, "_blank");
  if (!win) return false; // blocked by the browser
  try { win.opener = null; } catch { /* cross-origin, ignore */ }
  setLastOpened(now);
  return true;
}
