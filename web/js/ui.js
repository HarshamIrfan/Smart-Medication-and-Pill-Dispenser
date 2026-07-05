/**
 * ui.js — Shared UI utilities used across all modules.
 *
 * Keeping toast, modal, ripple, and scroll-reveal logic here avoids
 * duplicating DOM manipulation across module files.
 */

const UI = (() => {

  // ── Toast Notifications ────────────────────────────────────────────────

  const TOAST_ICONS = {
    success: 'check-circle-2',
    error:   'x-circle',
    warning: 'alert-triangle',
    info:    'info',
  };

  /**
   * Show a toast notification that auto-dismisses.
   * @param {string} title   - Bold heading
   * @param {string} message - Supporting text
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration - ms before auto-close (default 4000)
   */
  function toast(title, message = '', type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <span class="toast__icon">
        <i data-lucide="${TOAST_ICONS[type] || 'info'}"></i>
      </span>
      <div class="toast__body">
        <p class="toast__title">${escapeHtml(title)}</p>
        ${message ? `<p class="toast__message">${escapeHtml(message)}</p>` : ''}
      </div>
    `;

    container.appendChild(el);
    lucide.createIcons({ nodes: [el] });

    // Remove after duration — animate out first so the dismiss is smooth
    const timer = setTimeout(() => dismissToast(el), duration);
    el.addEventListener('click', () => { clearTimeout(timer); dismissToast(el); });
  }

  function dismissToast(el) {
    el.classList.add('toast--hiding');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  // ── Confirmation Dialog ────────────────────────────────────────────────

  let _confirmResolve = null;

  function confirm(message, confirmLabel = 'Confirm') {
    return new Promise(resolve => {
      _confirmResolve = resolve;
      const overlay  = document.getElementById('confirm-overlay');
      const msgEl    = document.getElementById('confirm-message');
      const okBtn    = document.getElementById('confirm-ok');

      msgEl.textContent = message;
      okBtn.textContent  = confirmLabel;
      overlay.removeAttribute('hidden');
      okBtn.focus();
    });
  }

  function _bindConfirmButtons() {
    document.getElementById('confirm-ok')?.addEventListener('click', () => {
      _resolveConfirm(true);
    });
    document.getElementById('confirm-cancel')?.addEventListener('click', () => {
      _resolveConfirm(false);
    });
  }

  function _resolveConfirm(value) {
    document.getElementById('confirm-overlay').setAttribute('hidden', '');
    if (_confirmResolve) {
      _confirmResolve(value);
      _confirmResolve = null;
    }
  }

  // ── Medication Modal ───────────────────────────────────────────────────

  let _editingId = null;
  let _onSave = null;

  function openModal(med = null, onSave = null) {
    _editingId = med ? med.id : null;
    _onSave    = onSave;

    const overlay = document.getElementById('med-modal-overlay');
    const title   = document.getElementById('modal-title');

    // Pre-fill or clear the form
    document.getElementById('field-name').value      = med ? med.name      : '';
    document.getElementById('field-dosage').value    = med ? med.dosage    : '';
    document.getElementById('field-time').value      = med ? med.time      : '';
    document.getElementById('field-frequency').value = med ? med.frequency : 'once-daily';
    document.getElementById('field-notes').value     = med ? med.notes     : '';

    clearModalErrors();
    title.textContent = med ? 'Edit Medication' : 'Add Medication';
    overlay.removeAttribute('hidden');
    document.getElementById('field-name').focus();
  }

  function closeModal() {
    document.getElementById('med-modal-overlay').setAttribute('hidden', '');
    _editingId = null;
    _onSave    = null;
  }

  function clearModalErrors() {
    ['name', 'dosage', 'time'].forEach(field => {
      const el = document.getElementById(`error-${field}`);
      if (el) { el.textContent = ''; el.setAttribute('hidden', ''); }
      document.getElementById(`field-${field}`)?.classList.remove('input-error');
    });
  }

  function showFieldError(field, msg) {
    const el = document.getElementById(`error-${field}`);
    if (el) { el.textContent = msg; el.removeAttribute('hidden'); }
    document.getElementById(`field-${field}`)?.classList.add('input-error');
  }

  function getModalValues() {
    return {
      name:      document.getElementById('field-name').value.trim(),
      dosage:    document.getElementById('field-dosage').value.trim(),
      time:      document.getElementById('field-time').value,
      frequency: document.getElementById('field-frequency').value,
      notes:     document.getElementById('field-notes').value.trim(),
    };
  }

  function getEditingId() { return _editingId; }
  function getOnSave()    { return _onSave; }

  function _bindModalButtons() {
    document.getElementById('modal-save')?.addEventListener('click', _handleModalSave);
    document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('modal-close')?.addEventListener('click', closeModal);

    // Close on overlay click (but not on modal itself)
    document.getElementById('med-modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!document.getElementById('med-modal-overlay').hasAttribute('hidden')) closeModal();
        if (!document.getElementById('confirm-overlay').hasAttribute('hidden'))    _resolveConfirm(false);
      }
    });
  }

  function _handleModalSave() {
    clearModalErrors();
    const values = getModalValues();
    let valid = true;

    if (!values.name)   { showFieldError('name',   'Name is required');   valid = false; }
    if (!values.dosage) { showFieldError('dosage', 'Dosage is required'); valid = false; }
    if (!values.time)   { showFieldError('time',   'Time is required');   valid = false; }

    if (!valid) return;

    let med;
    if (_editingId) {
      med = MedicationManager.update(_editingId, values);
      toast('Medication updated', med.name, 'success');
    } else {
      med = MedicationManager.create(values);
      toast('Medication added', med.name, 'success');
    }

    closeModal();
    if (typeof _onSave === 'function') _onSave(med);
  }

  // ── Ripple Effect ──────────────────────────────────────────────────────

  /** Attach ripple to all .btn elements — delegates via body listener. */
  function initRipples() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn');
      if (!btn) return;

      const rect   = btn.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height);
      const x      = e.clientX - rect.left - size / 2;
      const y      = e.clientY - rect.top  - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  }

  // ── Scroll Reveal ──────────────────────────────────────────────────────

  /** Add the reveal class to sections/cards; IntersectionObserver triggers them. */
  function initScrollReveal() {
    const targets = document.querySelectorAll(
      '.stat-card, .chart-card, .med-card, .device-card, .schedule-period, .section__header'
    );
    targets.forEach(el => el.classList.add('reveal'));

    // Also mark stat-grid and charts-grid for stagger
    document.querySelectorAll('.stat-grid, .charts-grid').forEach(el =>
      el.classList.add('reveal-stagger')
    );

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target); // reveal once
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => observer.observe(el));
  }

  // ── Active Nav Link Highlighting ───────────────────────────────────────

  function initNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const links    = document.querySelectorAll('.nav__link');

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(s => observer.observe(s));
  }

  // ── Nav Scroll Shadow ──────────────────────────────────────────────────

  function initNavShadow() {
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
      // Add subtle shadow when scrolled — visual feedback that nav is sticky
      nav.style.boxShadow = window.scrollY > 10
        ? 'var(--shadow-sm)'
        : 'none';
    }, { passive: true });
  }

  // ── Mobile Hamburger ───────────────────────────────────────────────────

  function initMobileNav() {
    const hamburger = document.getElementById('nav-hamburger');
    const drawer    = document.getElementById('nav-mobile-drawer');

    hamburger?.addEventListener('click', () => {
      const open = drawer.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open);
      drawer.setAttribute('aria-hidden', !open);
    });

    // Close drawer when any nav link is clicked
    drawer?.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        drawer.setAttribute('aria-hidden', 'true');
      });
    });
  }

  // ── Counter Animation ──────────────────────────────────────────────────

  /**
   * Animate a numeric counter from 0 to target.
   * @param {HTMLElement} el
   * @param {number} target
   * @param {string} suffix  - e.g. '%' or ''
   * @param {number} duration
   */
  function animateCounter(el, target, suffix = '', duration = 1200) {
    if (!el) return;
    const start  = Date.now();
    const from   = 0;

    function step() {
      const elapsed  = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = Math.round(from + (target - from) * eased);

      el.textContent = current + suffix;

      if (progress < 1) requestAnimationFrame(step);
      else el.classList.add('counter-done');
    }

    requestAnimationFrame(step);
  }

  // ── Utility ───────────────────────────────────────────────────────────

  /** Escape HTML special characters to prevent XSS when setting innerHTML. */
  function escapeHtml(str) {
    const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
    return String(str).replace(/[&<>"']/g, c => map[c]);
  }

  /** Format ISO timestamp for display. */
  function formatDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  function init() {
    _bindConfirmButtons();
    _bindModalButtons();
    initRipples();
    initScrollReveal();
    initNavHighlight();
    initNavShadow();
    initMobileNav();
  }

  return {
    toast,
    confirm,
    openModal,
    closeModal,
    getEditingId,
    getOnSave,
    animateCounter,
    escapeHtml,
    formatDateTime,
    init,
  };
})();
