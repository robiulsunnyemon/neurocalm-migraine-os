import Dexie, { type EntityTable } from "dexie";
import type {
  ClinicalAssessment,
  DailyLog,
  MedicationLog,
  MigraineAttack,
  UserPreferences,
} from "@/types/migraine";

export class NeuroCalmDB extends Dexie {
  dailyLogs!: EntityTable<DailyLog, "id">;
  attacks!: EntityTable<MigraineAttack, "id">;
  medications!: EntityTable<MedicationLog, "id">;
  assessments!: EntityTable<ClinicalAssessment, "id">;
  preferences!: EntityTable<UserPreferences, "id">;

  constructor() {
    super("NeuroCalmDB");
    this.version(1).stores({
      dailyLogs: "id, date, baselineStatus, synced, updatedAt",
      attacks: "id, dailyLogId, startedAt, peakPain, synced, updatedAt",
      medications: "id, dailyLogId, attackId, takenAt, category, synced, updatedAt",
      assessments: "id, type, completedAt, synced",
      preferences: "id",
    });
  }
}

export const db = new NeuroCalmDB();

export async function getOrCreatePreferences(): Promise<UserPreferences> {
  const existing = await db.preferences.get("default");
  if (existing) return existing;
  const defaults: UserPreferences = {
    id: "default",
    dimMode: "blackout",
    triptanMonthlyLimit: 10,
    nsaidMonthlyLimit: 15,
    pressureAlertEnabled: false,
    pressureDropThresholdHpa: 5,
  };
  await db.preferences.put(defaults);
  return defaults;
}
