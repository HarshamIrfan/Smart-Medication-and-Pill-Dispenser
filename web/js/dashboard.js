/**
 * dashboard.js — Renders and updates the Overview stat cards, the
 * Schedule section, the Medication Manager, and the History table.
 *
 * These sections all derive from the same medication + dose-log data,
 * so they live in one file to avoid tangled cross-module calls.
 */

const Dashboard = (() => {

  // ── Stat Cards ─────────────────────────────────────────────────────────

  function updateStatCards() {
    const meds    = MedicationManager.getAll();
    const total   = meds.length;

    let taken = 0;
    meds.forEach(m => {
      if (Storage.getDoseStatus(m.id) === 'taken') taken++;
    });

    // Next dose: first pending med at or after the current clock time
    const now    = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const pending = meds
      .filter(m => Storage.getDoseStatus(m.id) === 'pending')
      .sort((a, b) => a.time.localeCompare(b.time))
      .find(m => {
        const [h, min] = m.time.split(':').map(Number);
        return h * 60 + min >= nowMin;
      });

    const nextDoseEl = document.getElementById('stat-next-dose');
    const nextMedEl  = document.getElementById('stat-next-med');

    if (pending) {
      if (nextDoseEl) nextDoseEl.textContent = MedicationManager.formatTime(pending.time);
      if (nextMedEl)  nextMedEl.textContent  = pending.name;
    } else {
      if (nextDoseEl) nextDoseEl.textContent = '—';
      if (nextMedEl)  nextMedEl.textContent  = 'No upcoming doses today';
    }

    const totalEl = document.getElementById('stat-total-today');
    if (totalEl) totalEl.textContent = total;

    // Animate counter for taken doses
    const takenEl = document.getElementById('stat-taken-today');
    if (takenEl) UI.animateCounter(takenEl, taken, '', 800);

    // 7-day adherence from dose log
    const adherence = calcAdherence7Day();
    const adherenceEl = document.getElementById('stat-adherence');
    if (adherenceEl) UI.animateCounter(adherenceEl, adherence, '%', 1000);

    // Date heading
    const dateEl = document.getElementById('today-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric',
      });
    }
  }

  /** % of taken / (taken + missed) entries in the past 7 days. */
  function calcAdherence7Day() {
    const log    = Storage.getDoseLog();
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = log.filter(e => new Date(e.recordedAt).getTime() >= cutoff);
    const taken  = recent.filter(e => e.status === 'taken').length;
    const missed = recent.filter(e => e.status === 'missed').length;
    const total  = taken + missed;
    return total > 0 ? Math.round((taken / total) * 100) : 0;
  }

  // ── Schedule ────────────────────────────────────────────────────────────

  function renderSchedule() {
    const byPeriod  = MedicationManager.getByPeriod();
    const hasMeds   = MedicationManager.getAll().length > 0;
    const layout    = document.querySelector('.schedule-layout');
    const emptyEl   = document.getElementById('schedule-empty');

    if (layout)  layout.style.display  = hasMeds ? '' : 'none';
    if (emptyEl) emptyEl.hidden        = hasMeds;

    ['morning', 'afternoon', 'evening'].forEach(period => {
      const container = document.getElementById(`${period}-items`);
      if (!container) return;
      container.innerHTML = '';

      const meds = byPeriod[period];

      if (meds.length === 0) {
        const msg = document.createElement('div');
        msg.style.cssText = 'padding:1rem;text-align:center;color:var(--color-text-3);font-size:0.8rem;';
        msg.textContent   = 'No medications scheduled';
        container.appendChild(msg);
        return;
      }

      meds.forEach(med => {
        const status = Storage.getDoseStatus(med.id);
        container.appendChild(buildDoseItem(med, status));
      });
    });

    updateTimeCursor();
    // Re-bind action buttons after the DOM is rebuilt
    _bindDoseActionButtons();
  }

  function buildDoseItem(med, status) {
    const el = document.createElement('div');
    el.className = `dose-item dose-item--${status}`;
    el.setAttribute('role', 'listitem');
    el.dataset.medId = med.id;

    const isPending = status === 'pending';
    const isTaken   = status === 'taken';

    el.innerHTML = `
      <span class="dose-item__time">${MedicationManager.formatTime(med.time)}</span>
      <div class="dose-item__info">
        <p class="dose-item__name">${UI.escapeHtml(med.name)}</p>
        <p class="dose-item__dosage">${UI.escapeHtml(med.dosage)}</p>
      </div>
      <div class="dose-item__actions">
        ${isPending ? `
          <button class="dose-action dose-action--taken" data-action="taken" data-id="${med.id}"
            title="Mark taken" aria-label="Mark ${UI.escapeHtml(med.name)} as taken">
            <i data-lucide="check"></i>
          </button>
          <button class="dose-action dose-action--missed" data-action="missed" data-id="${med.id}"
            title="Mark missed" aria-label="Mark ${UI.escapeHtml(med.name)} as missed">
            <i data-lucide="x"></i>
          </button>
        ` : `
          <span class="badge badge--${isTaken ? 'success' : 'danger'}">
            ${isTaken ? 'Taken' : 'Missed'}
          </span>
          <button class="dose-action dose-action--reset" data-action="reset" data-id="${med.id}"
            title="Reset to pending" aria-label="Reset ${UI.escapeHtml(med.name)} to pending">
            <i data-lucide="rotate-ccw"></i>
          </button>
        `}
      </div>
    `;

    lucide.createIcons({ nodes: [el] });
    return el;
  }

  // Delegate dose-action clicks from schedule column containers
  function _bindDoseActionButtons() {
    document.querySelectorAll('.schedule-period__items').forEach(container => {
      // Remove old listener by cloning (simple approach avoiding WeakMap tracking)
      const fresh = container.cloneNode(true);
      container.parentNode.replaceChild(fresh, container);

      fresh.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const { action, id } = btn.dataset;
        const med = MedicationManager.getById(id);

        if (action === 'taken' || action === 'missed') {
          Storage.setDoseStatus(id, action);
          Storage.appendDoseLog({
            medId:      id,
            medName:    med?.name   || 'Unknown',
            dosage:     med?.dosage || '',
            time:       med?.time   || '',
            status:     action,
            recordedAt: new Date().toISOString(),
          });

          UI.toast(
            action === 'taken' ? 'Dose confirmed' : 'Dose marked missed',
            med?.name || '',
            action === 'taken' ? 'success' : 'warning'
          );

          _refreshAfterDoseChange();
        }

        if (action === 'reset') {
          Storage.setDoseStatus(id, 'pending');
          _refreshAfterDoseChange();
        }
      });
    });

    // Re-init icons inside the cloned nodes
    lucide.createIcons();
  }

  function _refreshAfterDoseChange() {
    renderSchedule();
    updateStatCards();
    renderHistory();
    if (typeof Charts !== 'undefined') Charts.updateAll();
    if (typeof Calendar !== 'undefined') Calendar.render();
  }

  function updateTimeCursor() {
    const cursor = document.getElementById('time-cursor');
    if (!cursor) return;
    // Map current time onto a 6 AM – midnight range (18 hours)
    const now             = new Date();
    const minutesSince6am = (now.getHours() - 6) * 60 + now.getMinutes();
    const totalMinutes    = 18 * 60;
    const pct = Math.max(0, Math.min(1, minutesSince6am / totalMinutes));
    cursor.style.top = `${pct * 100}%`;
  }

  function bindResetToday() {
    document.getElementById('reset-today-btn')?.addEventListener('click', async () => {
      const ok = await UI.confirm('Reset all today\'s doses back to pending?', 'Reset Day');
      if (!ok) return;
      Storage.resetTodayState();
      renderSchedule();
      updateStatCards();
      UI.toast('Day reset', 'All doses set back to pending', 'info');
    });
  }

  // ── History Table ───────────────────────────────────────────────────────

  function renderHistory() {
    const tbody  = document.getElementById('history-tbody');
    const empty  = document.getElementById('history-empty');
    const tableW = document.querySelector('.table-wrap');
    if (!tbody) return;

    const search = (document.getElementById('history-search')?.value || '').toLowerCase();
    const status = document.getElementById('history-filter-status')?.value || '';
    const sort   = document.getElementById('history-sort')?.value || 'newest';

    let log = Storage.getDoseLog();

    if (search) {
      log = log.filter(e =>
        e.medName.toLowerCase().includes(search) ||
        e.status.includes(search)
      );
    }
    if (status) {
      log = log.filter(e => e.status === status);
    }
    if (sort === 'oldest') {
      log = [...log].reverse();
    }

    const hasData = log.length > 0;
    if (empty)  empty.hidden           = hasData;
    if (tableW) tableW.style.display   = hasData ? '' : 'none';

    tbody.innerHTML = '';

    log.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      if (idx === 0) tr.classList.add('row-new'); // animate latest entry

      const med = MedicationManager.getById(entry.medId);
      const scheduledTime = med
        ? MedicationManager.formatTime(med.time)
        : (entry.time ? MedicationManager.formatTime(entry.time) : '—');

      tr.innerHTML = `
        <td><span class="history-med-name">${UI.escapeHtml(entry.medName)}</span></td>
        <td>${UI.escapeHtml(entry.dosage || '—')}</td>
        <td><span class="history-time">${scheduledTime}</span></td>
        <td><span class="history-time">${UI.formatDateTime(entry.recordedAt)}</span></td>
        <td>
          <span class="badge badge--${entry.status === 'taken' ? 'success' : 'danger'}">
            ${entry.status === 'taken' ? 'Taken' : 'Missed'}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function bindHistoryControls() {
    document.getElementById('history-search')?.addEventListener('input', renderHistory);
    document.getElementById('history-filter-status')?.addEventListener('change', renderHistory);
    document.getElementById('history-sort')?.addEventListener('change', renderHistory);

    document.getElementById('clear-history-btn')?.addEventListener('click', async () => {
      const ok = await UI.confirm(
        'Clear all dose history? This cannot be undone.',
        'Clear History'
      );
      if (!ok) return;
      Storage.clearDoseLog();
      renderHistory();
      updateStatCards();
      if (typeof Charts !== 'undefined') Charts.updateAll();
      UI.toast('History cleared', '', 'info');
    });
  }

  // ── Medication Manager ─────────────────────────────────────────────────

  function renderMedManager() {
    const grid   = document.getElementById('med-grid');
    const empty  = document.getElementById('manager-empty');
    if (!grid) return;

    const q    = document.getElementById('med-search')?.value || '';
    const freq = document.getElementById('med-filter-freq')?.value || '';
    const sort = document.getElementById('med-sort')?.value || 'name-asc';

    const meds    = MedicationManager.query(q, freq, sort);
    const hasMeds = meds.length > 0;

    if (empty) empty.hidden        = hasMeds;
    grid.style.display             = hasMeds ? '' : 'none';
    grid.innerHTML                 = '';

    meds.forEach(med => grid.appendChild(buildMedCard(med)));

    // Render lucide icons for the newly injected HTML
    lucide.createIcons({ nodes: [grid] });
  }

  function buildMedCard(med) {
    const el = document.createElement('div');
    el.className = 'med-card';
    el.setAttribute('role', 'listitem');
    el.dataset.medId = med.id;

    const status = Storage.getDoseStatus(med.id);
    const statusBadge =
      status === 'taken'  ? '<span class="badge badge--success">Taken today</span>' :
      status === 'missed' ? '<span class="badge badge--danger">Missed today</span>' : '';

    el.innerHTML = `
      <div class="med-card__header">
        <div>
          <p class="med-card__name">${UI.escapeHtml(med.name)}</p>
          <p class="med-card__dosage">${UI.escapeHtml(med.dosage)}</p>
        </div>
        ${statusBadge}
      </div>
      <div class="med-card__meta">
        <span class="med-card__tag">
          <i data-lucide="clock" style="width:12px;height:12px"></i>
          ${MedicationManager.formatTime(med.time)}
        </span>
        <span class="med-card__tag">
          <i data-lucide="repeat" style="width:12px;height:12px"></i>
          ${MedicationManager.freqLabel(med.frequency)}
        </span>
      </div>
      ${med.notes ? `<p class="med-card__notes">${UI.escapeHtml(med.notes)}</p>` : ''}
      <div class="med-card__actions">
        <button class="btn btn--secondary btn--sm med-edit" data-id="${med.id}"
          aria-label="Edit ${UI.escapeHtml(med.name)}">
          <i data-lucide="pencil"></i> Edit
        </button>
        <button class="btn btn--danger btn--sm med-delete" data-id="${med.id}"
          aria-label="Delete ${UI.escapeHtml(med.name)}">
          <i data-lucide="trash-2"></i> Delete
        </button>
      </div>
    `;

    // Bind edit
    el.querySelector('.med-edit').addEventListener('click', () => {
      UI.openModal(med, () => {
        renderMedManager();
        renderSchedule();
        updateStatCards();
      });
    });

    // Bind delete
    el.querySelector('.med-delete').addEventListener('click', async () => {
      const ok = await UI.confirm(
        `Delete "${med.name}"? This cannot be undone.`,
        'Delete'
      );
      if (!ok) return;
      MedicationManager.remove(med.id);
      renderMedManager();
      renderSchedule();
      updateStatCards();
      UI.toast('Medication deleted', med.name, 'info');
    });

    return el;
  }

  function bindManagerControls() {
    document.getElementById('med-search')?.addEventListener('input', renderMedManager);
    document.getElementById('med-filter-freq')?.addEventListener('change', renderMedManager);
    document.getElementById('med-sort')?.addEventListener('change', renderMedManager);

    // Every "Add" trigger opens the same modal
    ['open-add-modal', 'nav-add-med', 'schedule-add-btn', 'manager-add-btn'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        UI.openModal(null, () => {
          renderMedManager();
          renderSchedule();
          updateStatCards();
        });
      });
    });
  }

  // ── Live Clock ─────────────────────────────────────────────────────────

  function startClock() {
    function tick() {
      const el = document.getElementById('hero-time');
      if (el) {
        el.textContent = new Date().toLocaleTimeString(undefined, {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
      }
      updateTimeCursor();
    }
    tick();
    setInterval(tick, 1000);
  }

  function setFooterYear() {
    const el = document.getElementById('footer-year');
    if (el) el.textContent = new Date().getFullYear();
  }

  // ── Public ─────────────────────────────────────────────────────────────

  function init() {
    setFooterYear();
    startClock();
    updateStatCards();
    renderSchedule();
    bindResetToday();
    renderMedManager();
    bindManagerControls();
    renderHistory();
    bindHistoryControls();
  }

  return {
    init,
    updateStatCards,
    renderSchedule,
    renderMedManager,
    renderHistory,
    calcAdherence7Day,
  };
})();
