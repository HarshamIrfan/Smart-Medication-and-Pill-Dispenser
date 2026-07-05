/**
 * medication.js — CRUD operations for medication records.
 *
 * Each medication is a plain object:
 *   { id, name, dosage, time, frequency, notes, createdAt }
 *
 * This module owns the data shape; rendering is delegated to ui.js.
 */

const MedicationManager = (() => {
  // ── Internal helpers ────────────────────────────────────────────────────

  /** Generate a short collision-resistant ID (no external lib needed). */
  function genId() {
    return `med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /** Determine morning / afternoon / evening from HH:MM string. */
  function getPeriod(time) {
    const [h] = time.split(':').map(Number);
    if (h >= 6  && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'afternoon';
    return 'evening';
  }

  /** Format "HH:MM" to "h:MM AM/PM" for display. */
  function formatTime(time) {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour   = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  /** Human-readable frequency label. */
  const FREQ_LABELS = {
    'once-daily':        'Once daily',
    'twice-daily':       'Twice daily',
    'three-times-daily': 'Three times daily',
    'as-needed':         'As needed',
    'weekly':            'Weekly',
  };

  function freqLabel(freq) {
    return FREQ_LABELS[freq] || freq;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  function getAll() {
    return Storage.getMedications();
  }

  function getById(id) {
    return getAll().find(m => m.id === id) || null;
  }

  /** Create a new medication and persist it. Returns the new record. */
  function create({ name, dosage, time, frequency, notes }) {
    const med = {
      id:        genId(),
      name:      name.trim(),
      dosage:    dosage.trim(),
      time,
      frequency: frequency || 'once-daily',
      notes:     notes ? notes.trim() : '',
      createdAt: new Date().toISOString(),
    };
    const meds = getAll();
    meds.push(med);
    Storage.saveMedications(meds);
    return med;
  }

  /** Update an existing medication by id. Returns updated record or null. */
  function update(id, fields) {
    const meds = getAll();
    const idx  = meds.findIndex(m => m.id === id);
    if (idx === -1) return null;

    meds[idx] = {
      ...meds[idx],
      ...fields,
      name:  (fields.name  || meds[idx].name).trim(),
      dosage:(fields.dosage|| meds[idx].dosage).trim(),
      notes: (fields.notes !== undefined ? fields.notes : meds[idx].notes).trim(),
      updatedAt: new Date().toISOString(),
    };
    Storage.saveMedications(meds);
    return meds[idx];
  }

  /** Remove a medication by id. Returns true if removed. */
  function remove(id) {
    const meds = getAll();
    const next = meds.filter(m => m.id !== id);
    if (next.length === meds.length) return false;
    Storage.saveMedications(next);
    return true;
  }

  /**
   * Filter, sort, and return medications.
   * @param {string} query   - name search
   * @param {string} freq    - frequency filter value
   * @param {string} sort    - 'name-asc'|'name-desc'|'time-asc'|'time-desc'
   */
  function query(q = '', freq = '', sort = 'name-asc') {
    let meds = getAll();

    if (q) {
      const lower = q.toLowerCase();
      meds = meds.filter(m =>
        m.name.toLowerCase().includes(lower) ||
        m.dosage.toLowerCase().includes(lower) ||
        m.notes.toLowerCase().includes(lower)
      );
    }

    if (freq) {
      meds = meds.filter(m => m.frequency === freq);
    }

    meds.sort((a, b) => {
      switch (sort) {
        case 'name-asc':  return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'time-asc':  return a.time.localeCompare(b.time);
        case 'time-desc': return b.time.localeCompare(a.time);
        default:          return 0;
      }
    });

    return meds;
  }

  /**
   * Return medications grouped by period for the schedule view.
   * Each group is sorted by time ascending.
   */
  function getByPeriod() {
    const all = getAll().slice().sort((a, b) => a.time.localeCompare(b.time));
    return {
      morning:   all.filter(m => getPeriod(m.time) === 'morning'),
      afternoon: all.filter(m => getPeriod(m.time) === 'afternoon'),
      evening:   all.filter(m => getPeriod(m.time) === 'evening'),
    };
  }

  /**
   * Seed realistic demo medications so a fresh install looks populated.
   * Only runs when the medication list is completely empty.
   */
  function seedIfEmpty() {
    if (getAll().length > 0) return;

    const demos = [
      { name: 'Metformin',     dosage: '500 mg',  time: '08:00', frequency: 'twice-daily',  notes: 'Take with breakfast' },
      { name: 'Lisinopril',    dosage: '10 mg',   time: '09:00', frequency: 'once-daily',   notes: 'Monitor blood pressure' },
      { name: 'Atorvastatin',  dosage: '20 mg',   time: '21:00', frequency: 'once-daily',   notes: 'Take at bedtime' },
      { name: 'Metformin',     dosage: '500 mg',  time: '18:00', frequency: 'twice-daily',  notes: 'Take with dinner' },
      { name: 'Vitamin D3',    dosage: '1000 IU', time: '08:30', frequency: 'once-daily',   notes: 'With breakfast' },
    ];

    demos.forEach(d => create(d));
  }

  return {
    getAll,
    getById,
    create,
    update,
    remove,
    query,
    getByPeriod,
    getPeriod,
    formatTime,
    freqLabel,
    seedIfEmpty,
  };
})();
