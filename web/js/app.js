/**
 * app.js — Application bootstrap and theme controller.
 *
 * This is the only file that calls .init() on every module.
 * Load order matters: storage → medication → ui → dashboard → charts → calendar → particles → app.
 */

(function () {
  'use strict';

  // ── Theme ─────────────────────────────────────────────────────────────

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.saveTheme(theme);
  }

  function initTheme() {
    // Honour saved preference first, then OS preference
    const saved = Storage.getTheme();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next    = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      Charts.onThemeChange(); // charts need explicit recolor — CSS vars don't cascade into canvas
    });
  }

  // ── Day boundary reset ─────────────────────────────────────────────────

  /**
   * If the user leaves the tab open overnight, the "today" state from
   * yesterday persists in memory. We detect a date change and reset.
   */
  function initDayReset() {
    let lastDate = Storage.getTodayDateStr();

    setInterval(() => {
      const now = Storage.getTodayDateStr();
      if (now !== lastDate) {
        lastDate = now;
        Storage.resetTodayState();
        Dashboard.updateStatCards();
        Dashboard.renderSchedule();
        Calendar.render();
      }
    }, 60 * 1000); // Check every minute — cheap string compare
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Alt+A → Add medication (power-user shortcut)
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        UI.openModal(null, () => {
          Dashboard.renderMedManager();
          Dashboard.renderSchedule();
          Dashboard.updateStatCards();
        });
      }
    });
  }

  // ── Lucide icon render ─────────────────────────────────────────────────

  function initIcons() {
    // Initial render of all data-lucide attributes in static HTML.
    // Dynamically injected HTML calls lucide.createIcons({ nodes: [el] }) locally.
    lucide.createIcons();
  }

  // ── Boot sequence ──────────────────────────────────────────────────────

  function boot() {
    initTheme();
    initIcons();

    // Seed demo data so a fresh install looks meaningful
    MedicationManager.seedIfEmpty();

    UI.init();
    Dashboard.init();
    Charts.init();
    Calendar.init();
    Particles.init();

    initDayReset();
    initKeyboardShortcuts();

    // Periodically sync charts + stat cards in case the user leaves the
    // tab open — keeps the "next dose" time and adherence counters fresh
    setInterval(() => {
      Dashboard.updateStatCards();
      Charts.updateAll();
      Calendar.render();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Wait for DOM before booting
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
