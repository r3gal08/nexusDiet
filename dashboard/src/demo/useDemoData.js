import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';

/**
 * @typedef {Object} DietRow
 * @property {string} timestamp   – "YYYY-MM-DD HH:MM"
 * @property {string} platform    – Web | Reddit | YouTube | X | Instagram
 * @property {string} medium      – article | forum | video | feed
 * @property {string} source
 * @property {string} primary_subject
 * @property {string} category    – news | climate | finance | tech | entertainment | lifestyle
 * @property {string} tone        – negative | neutral | positive
 * @property {string} lean        – left | center | right | "n/a"
 * @property {number} seconds     – dwell time
 */

export const PRESET_DATASETS = [
  { id: 'lucy', label: 'Lucy: Doomscroller', file: 'lucy_doomscroller_day.csv' },
  { id: 'alyssa', label: 'Alyssa: Echo Chamber', file: 'alyssa_echochamber_day.csv' },
];

const DEFAULT_PRESET = PRESET_DATASETS[0];

/**
 * Parse CSV text into typed DietRow[].
 * Keeps lean "n/a" as a string — never coerced to null.
 */
function parseCSV(text) {
  const { data, errors } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // we type manually to protect "n/a"
  });

  if (errors.length) {
    console.warn('CSV parse warnings:', errors);
  }

  return data.map((row) => ({
    timestamp: (row.timestamp || '').trim(),
    platform: (row.platform || '').trim(),
    medium: (row.medium || '').trim(),
    source: (row.source || '').trim(),
    primary_subject: (row.primary_subject || '').trim(),
    category: (row.category || '').trim(),
    tone: (row.tone || '').trim(),
    lean: (row.lean || '').trim(),                 // keeps "n/a"
    seconds: parseInt(row.seconds, 10) || 0,
  }));
}

/**
 * Hook for demo mode.
 *
 * Returns { rows, fileName, selectedPresetId, loading, error, loadPreset, loadFile }.
 */
export function useDemoData() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load a preset file from public/test_data/
  const loadPreset = useCallback(async (presetId) => {
    const preset = PRESET_DATASETS.find((p) => p.id === presetId);
    if (!preset) return;

    setLoading(true);
    setError(null);
    setSelectedPresetId(preset.id);
    setFileName(preset.file);

    try {
      const res = await fetch(`./test_data/${preset.file}`);
      if (!res.ok) throw new Error(`Failed to load ${preset.file} (${res.status})`);
      const text = await res.text();
      setRows(parseCSV(text));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load a custom File object from a file-picker
  const loadFile = useCallback((file) => {
    setLoading(true);
    setError(null);
    setSelectedPresetId('custom');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result);
        setRows(parsed);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setLoading(false);
    };
    reader.readAsText(file);
  }, []);

  // Initial load on mount
  useEffect(() => {
    loadPreset(DEFAULT_PRESET.id);
  }, [loadPreset]);

  return { rows, fileName, selectedPresetId, loading, error, loadPreset, loadFile };
}
