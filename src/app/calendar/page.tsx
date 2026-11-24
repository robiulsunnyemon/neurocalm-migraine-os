"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/db/dexie";
import type { BaselineStatus } from "@/types/migraine";

const STATUS_BADGE: Record<BaselineStatus, { label: string; cls: string }> = {
  pain_free: {
    label: "Pain-Free",
    cls: "border-[#15803d]/50 text-[#4ade80]/80",
  },
  background: {
    label: "Background",
    cls: "border-[#78716c]/50 text-[#d4a373]",
  },
  functioning: {
    label: "Functioning",
    cls: "border-[#d97706]/60 text-[#f59e0b]/90",
  },
  bedbound: {
    label: "Bedbound",
    cls: "border-[#b91c1c]/70 text-[#ef4444]/90",
  },
};

export default function CalendarPage() {
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

  async function toggleMedWorked(id: string, worked: boolean) {
    await db.medications.update(id, {
      worked,
      updatedAt: new Date().toISOString(),
      synced: false,
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <h1 className="text-sm font-semibold text-[#d4a373]">
          Hybrid Chronic + Episodic Log (Last 30 Days)
        </h1>

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

      {/* Medication Efficacy Log for Prior Authorization */}
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
                    {m.name}
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
