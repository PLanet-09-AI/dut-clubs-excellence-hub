/**
 * Nomination open/closed toggle, controlled from the admin panel.
 *
 * Stored in Firestore at admin_settings/nominations (mirrors the
 * admin_settings/judging toggle pattern).
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const NOMINATIONS_SETTINGS_DOC = doc(db, "admin_settings", "nominations");

export function useNominationsOpen(): { open: boolean; loading: boolean } {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      NOMINATIONS_SETTINGS_DOC,
      (snap) => {
        setOpen(snap.exists() ? (snap.data()?.open ?? true) : true);
        setLoading(false);
      },
      (error) => {
        console.error("[Firestore] Failed to load nomination settings:", error);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { open, loading };
}

export async function setNominationsOpen(open: boolean): Promise<void> {
  await setDoc(NOMINATIONS_SETTINGS_DOC, {
    open,
    updatedAt: serverTimestamp(),
  });
}
