/**
 * useDraftForm — generic autosave + version-history hook
 *
 * Features:
 *  - Persists form state to localStorage under `storageKey`
 *  - Debounced autosave (default 800 ms) after every change
 *  - Snapshot ring-buffer (default 20 versions) — call `undo()` to revert
 *  - Detects a pre-existing draft on mount so callers can show a restore banner
 *  - SSR-safe (guards all localStorage access)
 *
 * Usage:
 *   const { draft, setDraft, undo, clearDraft, canUndo, status, lastSaved, hasDraft } =
 *     useDraftForm("my-form-key", initialValue);
 *
 *   // update a field:
 *   setDraft(prev => ({ ...prev, name: "Alice" }));
 *
 *   // undo last change:
 *   undo();
 *
 *   // clear on successful submit:
 *   clearDraft();
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DraftStatus = "idle" | "saving" | "saved";

type Snapshot<T> = { data: T; ts: number };

type Stored<T> = {
  current: T;
  snapshots: Snapshot<T>[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_SNAPSHOTS = 20;

function readStored<T>(key: string): Stored<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Stored<T>) : null;
  } catch {
    return null;
  }
}

function writeStored<T>(key: string, store: Stored<T>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(store));
  } catch {
    // Quota exceeded or private-browsing restriction — fail silently
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDraftForm<T>(
  storageKey: string,
  initial: T,
  debounceMs = 800
) {
  // All localStorage-derived state must start with SSR-safe defaults so the
  // server and client initial renders match exactly. localStorage is only
  // available in the browser, so we hydrate from it inside useEffect.
  const [draft, setDraftState] = useState<T>(initial);
  const [snapshots, setSnapshots] = useState<Snapshot<T>[]>([]);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Hydrate from localStorage after first paint (client only).
  useEffect(() => {
    const stored = readStored<T>(storageKey);
    if (stored) {
      setDraftState(stored.current);
      setSnapshots(stored.snapshots);
      const ts = stored.snapshots[0]?.ts;
      if (ts) setLastSaved(new Date(ts));
      setHasDraft(true);
    }
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refs so callbacks always see the latest values without stale closures
  const draftRef = useRef(draft);
  const snapshotsRef = useRef(snapshots);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    snapshotsRef.current = snapshots;
  }, [snapshots]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  /**
   * Update draft state.
   * Accepts a new value OR an updater function (same API as React's setState).
   * Triggers a debounced autosave and pushes the previous state onto the
   * snapshot history so the caller can `undo()` to it.
   */
  const setDraft = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const prev = draftRef.current;
      const next =
        typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;

      // Push the previous value onto history before applying the change
      const newSnapshots = [
        { data: prev, ts: Date.now() },
        ...snapshotsRef.current,
      ].slice(0, MAX_SNAPSHOTS);

      draftRef.current = next;
      snapshotsRef.current = newSnapshots;
      setDraftState(next);
      setSnapshots(newSnapshots);
      setStatus("saving");

      // Debounced persist
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        writeStored(storageKey, {
          current: draftRef.current,
          snapshots: snapshotsRef.current,
        });
        setStatus("saved");
        setLastSaved(new Date());
      }, debounceMs);
    },
    [storageKey, debounceMs]
  );

  /**
   * Revert draft to the most recent snapshot.
   * Also persists the reverted state immediately (no debounce).
   */
  const undo = useCallback(() => {
    const [last, ...rest] = snapshotsRef.current;
    if (!last) return;

    draftRef.current = last.data;
    snapshotsRef.current = rest;
    setDraftState(last.data);
    setSnapshots(rest);
    writeStored(storageKey, { current: last.data, snapshots: rest });
    setLastSaved(new Date(last.ts));
    setStatus("saved");
  }, [storageKey]);

  /**
   * Clear the persisted draft and reset to the initial value.
   * Call this after a successful form submission.
   */
  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
    draftRef.current = initial;
    snapshotsRef.current = [];
    setDraftState(initial);
    setSnapshots([]);
    setStatus("idle");
    setLastSaved(null);
  }, [storageKey, initial]);

  return {
    /** Current form data */
    draft,
    /** Update draft (and schedule autosave) */
    setDraft,
    /** Revert to the previous snapshot */
    undo,
    /** Clear storage and reset to initial */
    clearDraft,
    /** Whether there is at least one snapshot to undo to */
    canUndo: snapshots.length > 0,
    /** Number of available undo steps */
    snapshotCount: snapshots.length,
    /** 'idle' | 'saving' | 'saved' */
    status,
    /** Date of last successful persist (null if never saved) */
    lastSaved,
    /** True when a pre-existing draft was loaded from storage on mount (false during SSR) */
    hasDraft,
  };
}
