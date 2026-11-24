import Dexie, { type EntityTable } from "dexie";
import type {
  ClinicalAssessment,
  CustomMedication,
  DailyLog,
  MedicationLog,
  MigraineAttack,
  UserPreferences,
} from "@/types/migraine";

export const DEFAULT_TRIGGERS = [
  "caffeine",
  "dehydration",
  "skipped_meal",
  "screen_time",
  "bright_light",
  "hormones",
  "alcohol",
];

export const DEFAULT_CUSTOM_MEDS: CustomMedication[] = [
  { id: "med-sumatriptan", name: "Sumatriptan", dosage: "50mg", category: "triptan" },
  { id: "med-nurtec", name: "Nurtec ODT", dosage: "75mg", category: "gepant_cgrp" },
  { id: "med-ibuprofen", name: "Ibuprofen", dosage: "400mg", category: "nsaid" },
];

export class NeuroCalmDB extends Dexie {
  dailyLogs!: EntityTable<DailyLog, "id">;
  attacks!: EntityTable<MigraineAttack, "id">;
  medications!: EntityTable<MedicationLog, "id">;
  assessments!: EntityTable<ClinicalAssessment, "id">;
  preferences!: EntityTable<UserPreferences, "id">;
  customMeds!: EntityTable<CustomMedication, "id">;

  constructor() {
    super("NeuroCalmDB");
    this.version(1).stores({
      dailyLogs: "id, date, baselineStatus, synced, updatedAt",
      attacks: "id, dailyLogId, startedAt, peakPain, synced, updatedAt",
      medications: "id, dailyLogId, attackId, takenAt, category, synced, updatedAt",
      assessments: "id, type, completedAt, synced",
      preferences: "id",
    });
    this.version(2)
      .stores({
        dailyLogs: "id, date, baselineStatus, synced, updatedAt",
        attacks: "id, dailyLogId, startedAt, peakPain, synced, updatedAt",
        medications: "id, dailyLogId, attackId, takenAt, category, synced, updatedAt",
        assessments: "id, type, completedAt, synced",
        preferences: "id",
        customMeds: "id, name, category",
      })
      .upgrade(async (tx) => {
        const medsTable = tx.table<CustomMedication, string>("customMeds");
        const count = await medsTable.count();
        if (count === 0) {
          await medsTable.bulkPut(DEFAULT_CUSTOM_MEDS);
        }
      });
  }
}

export const db = new NeuroCalmDB();

export async function getOrCreatePreferences(): Promise<UserPreferences> {
  const existing = await db.preferences.get("default");
  if (existing) {
    if (!existing.customTriggers) {
      const updated = { ...existing, customTriggers: DEFAULT_TRIGGERS };
      await db.preferences.put(updated);
      return updated;
    }
    return existing;
  }
  const defaults: UserPreferences = {
    id: "default",
    dimMode: "blackout",
    triptanMonthlyLimit: 10,
    nsaidMonthlyLimit: 15,
    pressureAlertEnabled: false,
    pressureDropThresholdHpa: 5,
    customTriggers: DEFAULT_TRIGGERS,
  };
  await db.preferences.put(defaults);
  return defaults;
}

export async function ensureDefaultCustomMeds(): Promise<CustomMedication[]> {
  const existing = await db.customMeds.toArray();
  if (existing.length > 0) return existing;
  await db.customMeds.bulkPut(DEFAULT_CUSTOM_MEDS);
  return DEFAULT_CUSTOM_MEDS;
}
