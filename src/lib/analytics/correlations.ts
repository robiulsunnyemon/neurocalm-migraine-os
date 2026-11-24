import type { DailyLog, MigraineAttack } from "@/types/migraine";

export interface ThresholdInsight {
  factor: string;
  attackRateWithFactor: number; // percentage 0-100
  attackRateWithoutFactor: number; // percentage 0-100
  sampleSize: number;
  summary: string;
}

function getPreviousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * Compares Migraine Days against Good (Pain-Free) Days across:
 * 1. Physiological & Weather Thresholds (Sleep, Stress, Barometric Drop, Combined)
 * 2. User's Custom Triggers (same-day and 24-hour lag)
 */
export function computeThresholdInsights(
  dailyLogs: DailyLog[],
  attacks: MigraineAttack[]
): ThresholdInsight[] {
  if (dailyLogs.length < 3) return [];

  const byDate = new Map<string, DailyLog>();
  for (const log of dailyLogs) {
    byDate.set(log.date, log);
  }

  const attackDays = new Set(attacks.map((a) => a.dailyLogId));
  const isAttackDay = (d: DailyLog) =>
    attackDays.has(d.date) ||
    d.baselineStatus === "bedbound" ||
    d.baselineStatus === "functioning";

  const factors: {
    label: string;
    predicate: (d: DailyLog) => boolean;
    applicable: (d: DailyLog) => boolean;
  }[] = [
    {
      label: "Sleep < 6 hours",
      applicable: (d) => typeof d.sleepHours === "number",
      predicate: (d) => (d.sleepHours ?? 8) < 6,
    },
    {
      label: "Barometric Drop >= 5 hPa",
      applicable: (d) => typeof d.pressureDelta24h === "number",
      predicate: (d) => (d.pressureDelta24h ?? 0) <= -5,
    },
    {
      label: "High Stress (4-5/5)",
      applicable: (d) => typeof d.stressLevel === "number",
      predicate: (d) => (d.stressLevel ?? 1) >= 4,
    },
    {
      label: "Sleep < 6h + Pressure Drop",
      applicable: (d) =>
        typeof d.sleepHours === "number" && typeof d.pressureDelta24h === "number",
      predicate: (d) =>
        (d.sleepHours ?? 8) < 6 && (d.pressureDelta24h ?? 0) <= -5,
    },
  ];

  // Dynamically include all custom triggers logged by the user (same-day & 24h lag)
  const triggerSet = new Set<string>();
  for (const d of dailyLogs) {
    for (const t of d.triggers ?? []) {
      triggerSet.add(t);
    }
  }

  for (const trig of triggerSet) {
    const niceName = trig.replace(/_/g, " ");
    factors.push({
      label: `Trigger: ${niceName}`,
      applicable: () => true,
      predicate: (d) => (d.triggers ?? []).includes(trig),
    });
    factors.push({
      label: `24h Lag: ${niceName} (prev day)`,
      applicable: (d) => byDate.has(getPreviousDateKey(d.date)),
      predicate: (d) => {
        const prev = byDate.get(getPreviousDateKey(d.date));
        return Boolean(prev && (prev.triggers ?? []).includes(trig));
      },
    });
  }

  const insights: ThresholdInsight[] = [];

  for (const f of factors) {
    const pool = dailyLogs.filter(f.applicable);
    if (pool.length < 2) continue;

    const withFactor = pool.filter(f.predicate);
    const withoutFactor = pool.filter((d) => !f.predicate(d));
    if (withFactor.length === 0) continue;

    const rateWith = Math.round(
      (withFactor.filter(isAttackDay).length / withFactor.length) * 100
    );
    const rateWithout =
      withoutFactor.length > 0
        ? Math.round(
            (withoutFactor.filter(isAttackDay).length / withoutFactor.length) * 100
          )
        : 0;

    if (rateWith === 0 && rateWithout === 0) continue;

    insights.push({
      factor: f.label,
      attackRateWithFactor: rateWith,
      attackRateWithoutFactor: rateWithout,
      sampleSize: withFactor.length,
      summary: `${rateWith}% attack rate with ${f.label} (vs ${rateWithout}% without).`,
    });
  }

  return insights.sort(
    (a, b) =>
      b.attackRateWithFactor -
      b.attackRateWithoutFactor -
      (a.attackRateWithFactor - a.attackRateWithoutFactor)
  );
}
