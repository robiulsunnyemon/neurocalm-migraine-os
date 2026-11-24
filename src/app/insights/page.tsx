"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Activity, Check } from "lucide-react";
import { db } from "@/db/dexie";
import { computeThresholdInsights } from "@/lib/analytics/correlations";

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function InsightsPage() {
  const [today, setToday] = useState("");
  const dailyLogs = useLiveQuery(() => db.dailyLogs.toArray(), []) ?? [];
  const attacks = useLiveQuery(() => db.attacks.toArray(), []) ?? [];
  const insights = computeThresholdInsights(dailyLogs, attacks);

  const [sleep, setSleep] = useState("7");
  const [stress, setStress] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setToday(getTodayKey());
  }, []);

  async function saveContext() {
    if (!today) return;
    const existing = await db.dailyLogs.get(today);
    await db.dailyLogs.put({
      ...(existing ?? { id: today, date: today, baselineStatus: "pain_free" }),
      sleepHours: Number(sleep) || 7,
      stressLevel: stress,
      updatedAt: new Date().toISOString(),
      synced: false,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <h1 className="text-sm font-semibold text-[#d4a373]">
          Good-Day vs Migraine-Day Context ({today})
        </h1>
        <p className="text-[11px] text-[#78716c]">
          Log sleep & stress even on pain-free days so the AI avoids false-positive triggers.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-[#a8a29e] mb-1">
              Sleep (hours)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="16"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              className="w-full bg-black border border-[#261e1a] rounded-lg px-3 py-2 text-xs text-[#e7d8c9]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#a8a29e] mb-1">
              Stress Level (1–5)
            </label>
            <select
              value={stress}
              onChange={(e) => setStress(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="w-full bg-black border border-[#261e1a] rounded-lg px-3 py-2 text-xs text-[#e7d8c9]"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => void saveContext()}
          className="px-4 py-2 rounded-lg bg-[#14110f] border border-[#d97706]/50 text-xs text-[#d97706] flex items-center gap-1.5"
        >
          {saved && <Check className="w-3.5 h-3.5" />}
          <span>{saved ? "Saved" : "Save Today's Context"}</span>
        </button>
      </section>

      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#d4a373] flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-[#d97706]" />
          Threshold & Trigger Correlations
        </h2>

        {insights.length === 0 ? (
          <p className="text-xs text-[#78716c]">
            Log at least 3 days (including pain-free days) with sleep, stress, or pressure data to unlock multi-factor threshold insights.
          </p>
        ) : (
          <div className="space-y-2.5">
            {insights.map((ins) => (
              <div
                key={ins.factor}
                className="p-3 rounded-xl bg-black border border-[#261e1a] space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#e7d8c9]">{ins.factor}</span>
                  <span className="text-[#d97706]">
                    {ins.attackRateWithFactor}% attack rate
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#14110f] overflow-hidden">
                  <div
                    className="h-full bg-[#d97706]"
                    style={{ width: `${ins.attackRateWithFactor}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#78716c]">
                  {ins.summary} (n={ins.sampleSize})
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
