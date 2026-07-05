/**
 * calendar.js — Monthly medication calendar.
 *
 * Each day cell shows coloured dots representing the dose statuses
 * logged on that date. Navigation is handled purely in memory —
 * the viewed month is stored as state, not in localStorage.
 */

const Calendar = (() => {

  // Track which month the user is viewing
  let viewYear  = new Date().getFullYear();
  let viewMonth = new Date().getMonth(); // 0-indexed

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ── Build dot data from dose log ───────────────────────────────────────

  /**
   * Returns a map: { 'YYYY-MM-DD': { taken: N, missed: N, pending: N } }
   * We also fold in today's live pending doses so the current day
   * shows pending dots even before anything is logged.
   */
  function buildDayMap() {
    const map = {};

    // Historical log
    Storage.getDoseLog().forEach(e => {
      const date = e.recordedAt.slice(0, 10);
      if (!map[date]) map[date] = { taken: 0, missed: 0, pending: 0 };
      if (e.status === 'taken')  map[date].taken++;
      if (e.status === 'missed') map[date].missed++;
    });

    // Today's pending doses (not yet acted on)
    const today = Storage.getTodayDateStr();
    const meds  = MedicationManager.getAll();
    meds.forEach(m => {
      if (Storage.getDoseStatus(m.id) === 'pending') {
        if (!map[today]) map[today] = { taken: 0, missed: 0, pending: 0 };
        map[today].pending++;
      }
    });

    return map;
  }

  // ── Render calendar grid ───────────────────────────────────────────────

  function render() {
    const grid      = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('cal-month-label');
    if (!grid) return;

    // Update the month/year heading
    const heading = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
      month: 'long', year: 'numeric'
    });
    if (monthLabel) monthLabel.textContent = heading;

    grid.innerHTML = '';

    // Day-of-week header row
    DAY_NAMES.forEach(name => {
      const cell = document.createElement('div');
      cell.className = 'cal-day-header';
      cell.textContent = name;
      cell.setAttribute('aria-hidden', 'true');
      grid.appendChild(cell);
    });

    // First day offset (0 = Sunday)
    const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today       = Storage.getTodayDateStr();
    const dayMap      = buildDayMap();

    // Empty cells before the 1st
    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-day cal-day--empty';
      blank.setAttribute('aria-hidden', 'true');
      grid.appendChild(blank);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = dateStr === today;
      const data    = dayMap[dateStr] || { taken: 0, missed: 0, pending: 0 };

      const cell = document.createElement('div');
      cell.className = `cal-day${isToday ? ' cal-day--today' : ''}`;
      cell.setAttribute('role', 'gridcell');

      // Accessible label summarising the day's activity
      const summary = buildAriaLabel(d, data);
      cell.setAttribute('aria-label', summary);

      // Day number
      const num = document.createElement('span');
      num.className = 'cal-day__num';
      num.textContent = d;
      cell.appendChild(num);

      // Dots row (capped at 5 per status so cells don't overflow)
      if (data.taken > 0 || data.missed > 0 || data.pending > 0) {
        const dots = document.createElement('div');
        dots.className = 'cal-day__dots';
        dots.setAttribute('aria-hidden', 'true');

        appendDots(dots, 'taken',   Math.min(data.taken,   3));
        appendDots(dots, 'missed',  Math.min(data.missed,  3));
        appendDots(dots, 'pending', Math.min(data.pending, 3));

        cell.appendChild(dots);
      }

      grid.appendChild(cell);
    }
  }

  function appendDots(container, type, count) {
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('span');
      dot.className = `cal-dot cal-dot--${type}`;
      container.appendChild(dot);
    }
  }

  function buildAriaLabel(day, data) {
    const parts = [`Day ${day}`];
    if (data.taken   > 0) parts.push(`${data.taken} taken`);
    if (data.missed  > 0) parts.push(`${data.missed} missed`);
    if (data.pending > 0) parts.push(`${data.pending} pending`);
    return parts.join(', ');
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  function prevMonth() {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    render();
  }

  function nextMonth() {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    render();
  }

  function bindNavigation() {
    document.getElementById('cal-prev')?.addEventListener('click', prevMonth);
    document.getElementById('cal-next')?.addEventListener('click', nextMonth);
  }

  function init() {
    bindNavigation();
    render();
  }

  return { init, render };
})();
