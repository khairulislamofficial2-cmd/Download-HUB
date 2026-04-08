/**
 * localStorage helpers for download history.
 * Handles serialization, size limits, and graceful fallback if storage unavailable.
 */

import type { HistoryEntry } from "@/types";

const STORAGE_KEY = "vdl_history";
const MAX_ENTRIES = 20;

function isStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load all history entries from localStorage, newest first.
 */
export function loadHistory(): HistoryEntry[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save a new entry to history. Keeps only the latest MAX_ENTRIES.
 */
export function addHistoryEntry(entry: HistoryEntry): void {
  if (!isStorageAvailable()) return;
  try {
    const existing = loadHistory().filter((e) => e.id !== entry.id);
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage might be full; silently ignore
  }
}

/**
 * Clear all history entries.
 */
export function clearHistory(): void {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Remove a single history entry by ID.
 */
export function removeHistoryEntry(id: string): void {
  if (!isStorageAvailable()) return;
  try {
    const updated = loadHistory().filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}
