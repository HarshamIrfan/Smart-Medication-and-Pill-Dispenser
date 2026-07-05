/**
 * charts.js — Builds and updates all Chart.js visualisations.
 *
 * Charts are initialised once and updated in-place when data changes,
 * which avoids the flicker of destroy+recreate on every refresh.
 */

const Charts = (() => {

  let weeklyChart, doughnutChart, distributionChart, dailyChart;

  // Pull CSS variable values at runtime so charts respect the active theme
  function cssVar(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
  }

  // ── Shared chart defaults ───────────────────────────────────────────────

  function baseFont() {
    return { family: 'Inter, sans-serif', size: 12 };
  }

  function gridColor() {
    return cssVar('--chart-grid') || 'rgba(15,23,42,0.06)';
  }

  function textColor() {
    return cssVar('--chart-text') || '#475569';
  }

  // ── Data helpers ────────────────────────────────────────────────────────

  /**
   * Returns an array of 7 day labels (Mon, Tue …) ending today,
   * plus arrays of taken/missed counts per day.
   */
  function getWeekData() {
    const log  = Storage.getDoseLog();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    const labels  = days.map(d => d.toLocaleDateString(undefined, { weekday: 'short' }));
    const taken   = days.map(d => countByDayAndStatus(log, d, 'taken'));
    const missed  = days.map(d => countByDayAndStatus(log, d, 'missed'));

    // Adherence % per day
    const adherence = taken.map((t, i) => {
      const total = t + missed[i];
      return total > 0 ? Math.round((t / total) * 100) : 0;
    });

    return { labels, taken, missed, adherence };
  }

  function countByDayAndStatus(log, date, status) {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return log.filter(e => e.recordedAt.startsWith(dateStr) && e.status === status).length;
  }

  function getAllTimeTotals() {
    const log    = Storage.getDoseLog();
    const taken  = log.filter(e => e.status === 'taken').length;
    const missed = log.filter(e => e.status === 'missed').length;
    return { taken, missed };
  }

  /** Count doses per medication name in the last 7 days. */
  function getDistributionData() {
    const log  = Storage.getDoseLog();
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = log.filter(e => new Date(e.recordedAt).getTime() >= cutoff);

    const counts = {};
    recent.forEach(e => {
      counts[e.medName] = (counts[e.medName] || 0) + 1;
    });

    return {
      labels: Object.keys(counts),
      data:   Object.values(counts),
    };
  }

  // ── Chart: Weekly Adherence (bar) ───────────────────────────────────────

  function initWeeklyChart() {
    const ctx = document.getElementById('chart-weekly')?.getContext('2d');
    if (!ctx) return;

    const { labels, adherence } = getWeekData();

    weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Adherence %',
          data:  adherence,
          backgroundColor: adherence.map(v =>
            v >= 80 ? 'rgba(16,185,129,0.75)'
            : v >= 50 ? 'rgba(245,158,11,0.75)'
            : 'rgba(239,68,68,0.75)'
          ),
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        scales: {
          y: {
            min: 0, max: 100,
            ticks: { color: textColor(), font: baseFont(), callback: v => `${v}%` },
            grid:  { color: gridColor() },
          },
          x: {
            ticks: { color: textColor(), font: baseFont() },
            grid:  { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.parsed.y}% adherence` },
          },
        },
      },
    });
  }

  // ── Chart: Taken vs Missed (doughnut) ──────────────────────────────────

  function initDoughnutChart() {
    const ctx = document.getElementById('chart-doughnut')?.getContext('2d');
    if (!ctx) return;

    const { taken, missed } = getAllTimeTotals();

    // Show placeholder if no data at all
    const hasData = taken + missed > 0;

    doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Taken', 'Missed'],
        datasets: [{
          data:            hasData ? [taken, missed] : [1, 0],
          backgroundColor: hasData
            ? ['rgba(16,185,129,0.85)', 'rgba(239,68,68,0.75)']
            : ['rgba(203,213,225,0.6)', 'transparent'],
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation:  { duration: 900, easing: 'easeOutQuart' },
        cutout:     '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor(), font: baseFont(), padding: 16, usePointStyle: true },
          },
          tooltip: {
            enabled: hasData,
            callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` },
          },
        },
      },
    });
  }

  // ── Chart: Medication Distribution (horizontal bar) ─────────────────────

  function initDistributionChart() {
    const ctx = document.getElementById('chart-distribution')?.getContext('2d');
    if (!ctx) return;

    const { labels, data } = getDistributionData();
    const hasData = labels.length > 0;

    // Palette cycles through brand blues for multiple medications
    const palette = ['#2563EB','#3B82F6','#60A5FA','#93C5FD','#BFDBFE'];

    distributionChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels:   hasData ? labels : ['No data yet'],
        datasets: [{
          label: 'Doses (7 days)',
          data:  hasData ? data : [0],
          backgroundColor: hasData
            ? labels.map((_, i) => palette[i % palette.length])
            : ['rgba(203,213,225,0.6)'],
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800 },
        scales: {
          x: {
            ticks: { color: textColor(), font: baseFont(), precision: 0 },
            grid:  { color: gridColor() },
          },
          y: {
            ticks: { color: textColor(), font: baseFont() },
            grid:  { display: false },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  // ── Chart: Daily Completion (stacked bar) ──────────────────────────────

  function initDailyChart() {
    const ctx = document.getElementById('chart-daily')?.getContext('2d');
    if (!ctx) return;

    const { labels, taken, missed } = getWeekData();

    dailyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Taken',
            data:  taken,
            backgroundColor: 'rgba(16,185,129,0.8)',
            borderRadius: { topLeft: 5, topRight: 5 },
            borderSkipped: false,
            stack: 'stack',
          },
          {
            label: 'Missed',
            data:  missed,
            backgroundColor: 'rgba(239,68,68,0.7)',
            borderRadius: { topLeft: 5, topRight: 5 },
            borderSkipped: false,
            stack: 'stack',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        scales: {
          x: {
            stacked: true,
            ticks: { color: textColor(), font: baseFont() },
            grid:  { display: false },
          },
          y: {
            stacked: true,
            ticks: { color: textColor(), font: baseFont(), precision: 0 },
            grid:  { color: gridColor() },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor(), font: baseFont(), padding: 16, usePointStyle: true },
          },
        },
      },
    });
  }

  // ── Update all charts with fresh data ─────────────────────────────────

  function updateAll() {
    if (!weeklyChart || !doughnutChart || !distributionChart || !dailyChart) return;

    const { labels, taken, missed, adherence } = getWeekData();
    const totals = getAllTimeTotals();
    const dist   = getDistributionData();

    // Weekly adherence
    weeklyChart.data.labels = labels;
    weeklyChart.data.datasets[0].data = adherence;
    weeklyChart.data.datasets[0].backgroundColor = adherence.map(v =>
      v >= 80 ? 'rgba(16,185,129,0.75)'
      : v >= 50 ? 'rgba(245,158,11,0.75)'
      : 'rgba(239,68,68,0.75)'
    );
    weeklyChart.update();

    // Doughnut
    const hasData = totals.taken + totals.missed > 0;
    doughnutChart.data.datasets[0].data = hasData ? [totals.taken, totals.missed] : [1, 0];
    doughnutChart.update();

    // Distribution
    distributionChart.data.labels = dist.labels.length > 0 ? dist.labels : ['No data yet'];
    distributionChart.data.datasets[0].data = dist.data.length > 0 ? dist.data : [0];
    distributionChart.update();

    // Daily stacked
    dailyChart.data.labels = labels;
    dailyChart.data.datasets[0].data = taken;
    dailyChart.data.datasets[1].data = missed;
    dailyChart.update();
  }

  // Re-colour charts when the theme changes (CSS vars shift)
  function onThemeChange() {
    [weeklyChart, doughnutChart, distributionChart, dailyChart].forEach(c => {
      if (!c) return;
      c.options.plugins.legend.labels.color = textColor();
      c.options.scales?.x && (c.options.scales.x.ticks.color = textColor());
      c.options.scales?.y && (c.options.scales.y.ticks.color = textColor());
      c.options.scales?.x && (c.options.scales.x.grid.color  = gridColor());
      c.options.scales?.y && (c.options.scales.y.grid.color  = gridColor());
      c.update();
    });
  }

  function init() {
    // Slight delay so the section is in view before Chart.js measures canvas
    setTimeout(() => {
      initWeeklyChart();
      initDoughnutChart();
      initDistributionChart();
      initDailyChart();
    }, 100);
  }

  return { init, updateAll, onThemeChange };
})();
