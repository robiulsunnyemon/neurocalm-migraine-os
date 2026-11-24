import type { MedicationLog, MigraineAttack } from "@/types/migraine";

export interface MohStatus {
  triptanDaysThisMonth: number;
  nsaidDaysThisMonth: number;
  gepantDaysThisMonth: number;
  triptanWarning: boolean;
  nsaidWarning: boolean;
}

export function calculateMidasScore(answers: number[]): {
  score: number;
  grade: string;
} {
  const score = answers.slice(0, 5).reduce((sum, n) => sum + Math.max(0, n), 0);
  if (score <= 5) return { score, grade: "Grade I — Little or No Disability" };
  if (score <= 10) return { score, grade: "Grade II — Mild Disability" };
  if (score <= 20) return { score, grade: "Grade III — Moderate Disability" };
  return { score, grade: "Grade IV — Severe Disability" };
}

export function calculateHit6Score(answers: number[]): {
  score: number;
  grade: string;
} {
  const score = answers.slice(0, 6).reduce((sum, n) => sum + n, 0);
  if (score <= 49) return { score, grade: "Little or No Impact" };
  if (score <= 55) return { score, grade: "Some Impact" };
  if (score <= 59) return { score, grade: "Substantial Impact" };
  return { score, grade: "Severe Impact" };
}

export function computeMohStatus(
  meds: MedicationLog[],
  monthPrefix?: string,
  triptanLimit = 10,
  nsaidLimit = 15
): MohStatus {
  if (!monthPrefix) {
    return {
      triptanDaysThisMonth: 0,
      nsaidDaysThisMonth: 0,
      gepantDaysThisMonth: 0,
      triptanWarning: false,
      nsaidWarning: false,
    };
  }

  const thisMonth = meds.filter((m) => m.takenAt.startsWith(monthPrefix));
  const uniqueDays = (cat: MedicationLog["category"]) =>
    new Set(thisMonth.filter((m) => m.category === cat).map((m) => m.dailyLogId)).size;

  const triptanDaysThisMonth = uniqueDays("triptan");
  const nsaidDaysThisMonth = uniqueDays("nsaid");
  const gepantDaysThisMonth = uniqueDays("gepant_cgrp");

  return {
    triptanDaysThisMonth,
    nsaidDaysThisMonth,
    gepantDaysThisMonth,
    triptanWarning: triptanDaysThisMonth >= Math.max(1, triptanLimit - 2),
    nsaidWarning: nsaidDaysThisMonth >= Math.max(1, nsaidLimit - 3),
  };
}

export function getFailedTherapies(meds: MedicationLog[]): string[] {
  const failed = new Set<string>();
  for (const m of meds) {
    if (m.worked === false) {
      failed.add(m.name);
    }
  }
  return Array.from(failed);
}

export function countMonthlyMigraineDays(attacks: MigraineAttack[]): number {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return new Set(
    attacks
      .filter((a) => a.dailyLogId.startsWith(monthPrefix))
      .map((a) => a.dailyLogId)
  ).size;
}
