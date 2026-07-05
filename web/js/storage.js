/**
 * storage.js — Thin wrapper around localStorage.
 *
 * Centralising all reads/writes here means:
 *  - If we ever swap to IndexedDB, only this file changes.
 *  - JSON parse/stringify errors are caught in one place.
 *  - Other modules never deal with raw string serialisation.
 */

const Storage = (() => {
  const KEYS = {
    MEDICATIONS: 'medtrack_medications',
    DOSE_LOG:    'medtrack_dose_log',
    TODAY_STATE: 'medtrack_today_state',
    THEME:       'medtrack_theme',
  };

  /** Read and parse a key; return fallback if missing or malformed. */
  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  /** Serialise and write a value. Returns true on success. */
  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      console.warn('[MedTrack] localStorage write failed — storage may be full.');
      return false;
    }
  }

  /** Remove a key entirely. */
  function remove(key) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }

  // ── Medication records ──────────────────────────────────────────────────

  function getMedications() {
    return get(KEYS.MEDICATIONS, []);
  }

  function saveMedications(meds) {
    return set(KEYS.MEDICATIONS, meds);
  }

  // ── Dose log (historical, append-only) ─────────────────────────────────

  function getDoseLog() {
    return get(KEYS.DOSE_LOG, []);
  }

  function appendDoseLog(entry) {
    const log = getDoseLog();
    log.unshift(entry); // newest first for cheap O(1) prepend
    return set(KEYS.DOSE_LOG, log);
  }

  function clearDoseLog() {
    return set(KEYS.DOSE_LOG, []);
  }

  // ── Today's per-dose status (resets each day via app.js) ───────────────
  // Key: "<medId>_<YYYY-MM-DD>", value: 'taken' | 'missed' | 'pending'

  function getTodayKey(medId) {
    return `${medId}_${getTodayDateStr()}`;
  }

  function getTodayState() {
    return get(KEYS.TODAY_STATE, {});
  }

  function setDoseStatus(medId, status) {
    const state = getTodayState();
    state[getTodayKey(medId)] = status;
    return set(KEYS.TODAY_STATE, state);
  }

  function getDoseStatus(medId) {
    const state = getTodayState();
    return state[getTodayKey(medId)] || 'pending';
  }

  function resetTodayState() {
    return set(KEYS.TODAY_STATE, {});
  }

  // ── Theme preference ────────────────────────────────────────────────────

  function getTheme() {
    return get(KEYS.THEME, 'light');
  }

  function saveTheme(theme) {
    return set(KEYS.THEME, theme);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Returns today as 'YYYY-MM-DD' in local time. */
  function getTodayDateStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return {
    getMedications,
    saveMedications,
    getDoseLog,
    appendDoseLog,
    clearDoseLog,
    getTodayState,
    setDoseStatus,
    getDoseStatus,
    resetTodayState,
    getTheme,
    saveTheme,
    getTodayDateStr,
  };
})();
