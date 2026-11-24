import {
  collection,
  doc,
  getDocs,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { db } from "@/db/dexie";
import { getFirebaseClient } from "@/lib/firebase/client";
import type {
  ClinicalAssessment,
  DailyLog,
  MedicationLog,
  MigraineAttack,
} from "@/types/migraine";

export interface SyncResult {
  pushed: number;
  pulled: number;
  error?: string;
}

async function pushCollection<T extends { id: string; synced: boolean }>(
  firestore: Firestore,
  userId: string,
  collectionName: string,
  items: T[],
  markSynced: (id: string) => Promise<void>
): Promise<number> {
  if (items.length === 0) return 0;

  const batch = writeBatch(firestore);
  for (const item of items) {
    const ref = doc(firestore, "users", userId, collectionName, item.id);
    batch.set(ref, { ...item, synced: true }, { merge: true });
  }
  await batch.commit();

  await Promise.all(items.map((item) => markSynced(item.id)));
  return items.length;
}

/**
 * Bidirectional offline-first sync between Dexie (IndexedDB) and Firebase Firestore.
 * Local Dexie always remains the immediate source of truth for zero-latency Blackout logging.
 */
export async function syncWithFirestore(userId: string): Promise<SyncResult> {
  const { firestore } = getFirebaseClient();
  if (!firestore) {
    return {
      pushed: 0,
      pulled: 0,
      error: "Firebase is not configured yet. Running in 100% offline local mode.",
    };
  }

  try {
    let pushed = 0;

    // 1. Push unsynced local records to Firestore
    const unsyncedDaily = await db.dailyLogs
      .filter((d) => !d.synced)
      .toArray();
    pushed += await pushCollection(
      firestore,
      userId,
      "dailyLogs",
      unsyncedDaily,
      async (id) => {
        await db.dailyLogs.update(id, { synced: true });
      }
    );

    const unsyncedAttacks = await db.attacks
      .filter((a) => !a.synced)
      .toArray();
    pushed += await pushCollection(
      firestore,
      userId,
      "attacks",
      unsyncedAttacks,
      async (id) => {
        await db.attacks.update(id, { synced: true });
      }
    );

    const unsyncedMeds = await db.medications
      .filter((m) => !m.synced)
      .toArray();
    pushed += await pushCollection(
      firestore,
      userId,
      "medications",
      unsyncedMeds,
      async (id) => {
        await db.medications.update(id, { synced: true });
      }
    );

    const unsyncedAssessments = await db.assessments
      .filter((a) => !a.synced)
      .toArray();
    pushed += await pushCollection(
      firestore,
      userId,
      "assessments",
      unsyncedAssessments,
      async (id) => {
        await db.assessments.update(id, { synced: true });
      }
    );

    // 2. Pull remote records into Dexie (last-write-wins via updatedAt)
    let pulled = 0;

    const remoteDailySnap = await getDocs(
      collection(firestore, "users", userId, "dailyLogs")
    );
    for (const d of remoteDailySnap.docs) {
      const remote = d.data() as DailyLog;
      const local = await db.dailyLogs.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        await db.dailyLogs.put({ ...remote, synced: true });
        pulled++;
      }
    }

    const remoteAttacksSnap = await getDocs(
      collection(firestore, "users", userId, "attacks")
    );
    for (const d of remoteAttacksSnap.docs) {
      const remote = d.data() as MigraineAttack;
      const local = await db.attacks.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        await db.attacks.put({ ...remote, synced: true });
        pulled++;
      }
    }

    const remoteMedsSnap = await getDocs(
      collection(firestore, "users", userId, "medications")
    );
    for (const d of remoteMedsSnap.docs) {
      const remote = d.data() as MedicationLog;
      const local = await db.medications.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        await db.medications.put({ ...remote, synced: true });
        pulled++;
      }
    }

    const remoteAssessmentsSnap = await getDocs(
      collection(firestore, "users", userId, "assessments")
    );
    for (const d of remoteAssessmentsSnap.docs) {
      const remote = d.data() as ClinicalAssessment;
      const local = await db.assessments.get(remote.id);
      if (!local) {
        await db.assessments.put({ ...remote, synced: true });
        pulled++;
      }
    }

    return { pushed, pulled };
  } catch (err) {
    return {
      pushed: 0,
      pulled: 0,
      error: err instanceof Error ? err.message : "Sync failed",
    };
  }
}
