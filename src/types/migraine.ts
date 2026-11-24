export type BaselineStatus =
  | "pain_free"
  | "background"
  | "functioning"
  | "bedbound";

export type PainLocation =
  | "left"
  | "right"
  | "bilateral"
  | "neck"
  | "eye"
  | "sinus";

export type MigraineSymptom =
  | "aura"
  | "nausea"
  | "photophobia"
  | "phonophobia"
  | "brain_fog"
  | "dizziness";

export type MedicationCategory =
  | "triptan"
  | "gepant_cgrp"
  | "nsaid"
  | "preventive"
  | "other";

export interface DailyLog {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  baselineStatus: BaselineStatus;
  sleepHours?: number;
  stressLevel?: 1 | 2 | 3 | 4 | 5;
  hydrationLiters?: number;
  triggers?: string[];
  barometricPressureHpa?: number;
  pressureDelta24h?: number;
  notes?: string;
  updatedAt: string;
  synced: boolean;
}

export interface MigraineAttack {
  id: string;
  dailyLogId: string; // YYYY-MM-DD
  startedAt: string;
  endedAt?: string;
  peakPain: number; // 1 - 10
  locations: PainLocation[];
  symptoms: MigraineSymptom[];
  voiceTranscript?: string;
  updatedAt: string;
  synced: boolean;
}

export interface MedicationLog {
  id: string;
  attackId?: string;
  dailyLogId: string; // YYYY-MM-DD
  takenAt: string;
  name: string;
  dosage?: string;
  category: MedicationCategory;
  worked?: boolean;
  updatedAt: string;
  synced: boolean;
}

export interface ClinicalAssessment {
  id: string;
  type: "MIDAS" | "HIT6";
  score: number;
  severityLabel: string;
  answers: number[];
  completedAt: string;
  synced: boolean;
}

export interface UserPreferences {
  id: "default";
  dimMode: "blackout" | "amber" | "red";
  triptanMonthlyLimit: number;
  nsaidMonthlyLimit: number;
  latitude?: number;
  longitude?: number;
  pressureAlertEnabled: boolean;
  pressureDropThresholdHpa: number;
}
