"use client";

import React, { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/db/dexie";
import type { BaselineStatus } from "@/types/migraine";

const STATUS_BADGE: Record<
  BaselineStatus,
  { label: string; cls: string; heatCls: string }
> = {
  pain_free: {
    label: "Pain-Free",
    cls: "border-[#15803d]/50 text-[#4ade80]/80",
    heatCls: "bg-[#15803d]/50 border-[#15803d]/70",
  },
  background: {
    label: "Background",
    cls: "border-[#78716c]/50 text-[#d4a373]",
    heatCls: "bg-[#44403c]/60 border-[#78716c]/60",
  },
  functioning: {
    label: "Functioning",
    cls: "border-[#d97706]/60 text-[#f59e0b]/90",
    heatCls: "bg-[#d97706]/50 border-[#d97706]/80",
  },
  bedbound: {
    label: "Bedbound",
    cls: "border-[#b91c1c]/70 text-[#ef4444]/90",
    heatCls: "bg-[#b91c1c]/65 border-[#ef4444]/80",
  },
};

export default function CalendarPage() {
  const [last30Keys, setLast30Keys] = useState<string[]>([]);

  useEffect(() => {
    const keys: string[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      keys.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(d.getDate()).padStart(2, "0")}`
      );
    }
    setLast30Keys(keys);
  }, []);

  const dailyLogs =
    useLiveQuery(
      () => db.dailyLogs.orderBy("date").reverse().limit(30).toArray(),
      []
    ) ?? [];
  const attacks =
    useLiveQuery(
      () => db.attacks.orderBy("startedAt").reverse().limit(30).toArray(),
      []
    ) ?? [];
  const meds =
    useLiveQuery(
      () => db.medications.orderBy("takenAt").reverse().limit(20).toArray(),
      []
    ) ?? [];

  const logByDate = new Map(dailyLogs.map((l) => [l.date, l]));

  async function toggleMedWorked(id: string, worked: boolean) {
    await db.medications.update(id, {
      worked,
      updatedAt: new Date().toISOString(),
      synced: false,
    });
  }

  return (
    <div className="space-y-5">
      {/* 30-Day Visual Heatmap Grid */}
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-[#d4a373]">
            30-Day Migraine Heatmap
          </h1>
          <span className="text-[10px] text-[#78716c]">Last 30 days</span>
        </div>

        <div className="grid grid-cols-10 gap-1.5">
          {last30Keys.map((dateKey) => {
            const log = logByDate.get(dateKey);
            const heatCls = log
              ? STATUS_BADGE[log.baselineStatus].heatCls
              : "bg-black border-[#261e1a]";
            const hasSpike = attacks.some((a) => a.dailyLogId === dateKey);
            return (
              <div
                key={dateKey}
                title={`${dateKey}: ${
                  log ? STATUS_BADGE[log.baselineStatus].label : "No log"
                }`}
                className={`aspect-square rounded-md border flex items-center justify-center text-[9px] text-[#e7d8c9]/80 ${heatCls}`}
              >
                {hasSpike ? "•" : dateKey.slice(8)}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 pt-1 text-[10px] text-[#78716c]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#15803d]/50 inline-block" />{" "}
            Pain-Free
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#44403c]/60 inline-block" />{" "}
            Background
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#d97706]/50 inline-block" />{" "}
            Functioning
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#b91c1c]/65 inline-block" />{" "}
            Bedbound
          </span>
        </div>
      </section>

      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#d4a373]">
          Daily Baseline & Attack Spikes
        </h2>

        {dailyLogs.length === 0 ? (
          <p className="text-xs text-[#78716c]">
            No days logged yet. Tap a baseline status on the Log tab to start.
          </p>
        ) : (
          <div className="space-y-2">
            {dailyLogs.map((day) => {
              const badge = STATUS_BADGE[day.baselineStatus];
              const dayAttacks = attacks.filter((a) => a.dailyLogId === day.date);
              return (
                <div
                  key={day.id}
                  className="p-3 rounded-xl bg-black border border-[#261e1a] flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-medium text-[#e7d8c9]">
                      {day.date}
                    </div>
                    <div className="text-[11px] text-[#78716c] mt-0.5">
                      {dayAttacks.length > 0
                        ? `${dayAttacks.length} spike(s) • Peak ${Math.max(
                            ...dayAttacks.map((a) => a.peakPain)
                          )}/10`
                        : "No acute spikes"}
                      {typeof day.barometricPressureHpa === "number" &&
                        ` • ${day.barometricPressureHpa} hPa`}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-lg border ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[#d4a373]">
            Medication Efficacy (Prior-Auth Proof)
          </h2>
          <p className="text-[11px] text-[#78716c] mt-0.5">
            Mark whether a medication worked — failed therapies appear on your Insurance PDF.
          </p>
        </div>

        {meds.length === 0 ? (
          <p className="text-xs text-[#78716c]">No medications logged yet.</p>
        ) : (
          <div className="space-y-2">
            {meds.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-black border border-[#261e1a] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-medium text-[#e7d8c9]">
                    {m.name} {m.dosage ? `(${m.dosage})` : ""}
                  </div>
                  <div className="text-[10px] text-[#78716c]">
                    {m.dailyLogId} • {m.category}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void toggleMedWorked(m.id, true)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                      m.worked === true
                        ? "border-[#15803d] text-[#4ade80] bg-[#051a0c]"
                        : "border-[#261e1a] text-[#78716c]"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Helped</span>
                  </button>
                  <button
                    onClick={() => void toggleMedWorked(m.id, false)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                      m.worked === false
                        ? "border-[#b91c1c] text-[#f87171] bg-[#1a0505]"
                        : "border-[#261e1a] text-[#78716c]"
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Failed</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
