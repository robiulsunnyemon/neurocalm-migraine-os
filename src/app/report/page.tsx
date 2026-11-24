"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, FileText } from "lucide-react";
import { db } from "@/db/dexie";
import {
  calculateHit6Score,
  calculateMidasScore,
} from "@/lib/clinical/assessments";
import { generateClinicalPdf } from "@/lib/pdf/clinicalReport";

const MIDAS_QUESTIONS = [
  "Days missed work/school due to headache (last 3 months)",
  "Days productivity reduced by >=50% at work/school",
  "Days unable to do household work",
  "Days household productivity reduced by >=50%",
  "Days missed family, social, or leisure activities",
];

const HIT6_QUESTIONS = [
  "How often is headache pain severe?",
  "How often do headaches limit daily activities?",
  "How often do you wish you could lie down?",
  "How often do you feel too tired to work?",
  "How often do you feel fed up/irritated?",
  "How often do headaches limit concentration?",
];

const HIT6_CHOICES = [
  { label: "Never", val: 6 },
  { label: "Rarely", val: 8 },
  { label: "Sometimes", val: 10 },
  { label: "Very Often", val: 11 },
  { label: "Always", val: 13 },
];

export default function ReportPage() {
  const dailyLogs = useLiveQuery(() => db.dailyLogs.toArray(), []) ?? [];
  const attacks =
    useLiveQuery(() => db.attacks.orderBy("startedAt").reverse().toArray(), []) ??
    [];
  const medications = useLiveQuery(() => db.medications.toArray(), []) ?? [];
  const assessments =
    useLiveQuery(
      () => db.assessments.orderBy("completedAt").reverse().toArray(),
      []
    ) ?? [];

  const [tab, setTab] = useState<"MIDAS" | "HIT6">("MIDAS");
  const [midasAnswers, setMidasAnswers] = useState<number[]>([0, 0, 0, 0, 0]);
  const [hit6Answers, setHit6Answers] = useState<number[]>([6, 6, 6, 6, 6, 6]);
  const [savedScore, setSavedScore] = useState<string | null>(null);

  async function saveMidas() {
    const { score, grade } = calculateMidasScore(midasAnswers);
    await db.assessments.put({
      id: crypto.randomUUID(),
      type: "MIDAS",
      score,
      severityLabel: grade,
      answers: midasAnswers,
      completedAt: new Date().toISOString(),
      synced: false,
    });
    setSavedScore(`Saved MIDAS: ${score} (${grade})`);
  }

  async function saveHit6() {
    const { score, grade } = calculateHit6Score(hit6Answers);
    await db.assessments.put({
      id: crypto.randomUUID(),
      type: "HIT6",
      score,
      severityLabel: grade,
      answers: hit6Answers,
      completedAt: new Date().toISOString(),
      synced: false,
    });
    setSavedScore(`Saved HIT-6: ${score} (${grade})`);
  }

  function handleDownloadPdf() {
    generateClinicalPdf({
      dailyLogs,
      attacks,
      medications,
      assessments,
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <div>
          <h1 className="text-sm font-semibold text-[#d4a373] flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#d97706]" />
            Doctor &amp; Insurance Report
          </h1>
          <p className="text-[11px] text-[#78716c] mt-0.5">
            1-page clinical summary with MIDAS, HIT-6, med limits, and failed therapies.
          </p>
        </div>

        <button
          onClick={handleDownloadPdf}
          className="w-full py-3 rounded-xl bg-[#14110f] border border-[#d97706]/60 text-xs font-semibold text-[#d97706] flex items-center justify-center gap-2 hover:bg-[#1f1914] transition"
        >
          <Download className="w-4 h-4" />
          <span>Export 1-Page PDF</span>
        </button>
      </section>

      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#d4a373]">
            Clinical Disability Assessments
          </h2>
          <div className="flex gap-1.5">
            {(["MIDAS", "HIT6"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setSavedScore(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] border ${
                  tab === t
                    ? "bg-[#14110f] border-[#d97706] text-[#d97706]"
                    : "bg-black border-[#261e1a] text-[#78716c]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === "MIDAS" ? (
          <div className="space-y-2.5">
            {MIDAS_QUESTIONS.map((q, idx) => (
              <div
                key={q}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black border border-[#261e1a]"
              >
                <span className="text-[11px] text-[#a8a29e]">{q}</span>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={midasAnswers[idx]}
                  onChange={(e) => {
                    const next = [...midasAnswers];
                    next[idx] = Math.max(0, Number(e.target.value) || 0);
                    setMidasAnswers(next);
                  }}
                  className="w-16 bg-[#0a0a0a] border border-[#261e1a] rounded-lg px-2 py-1 text-xs text-center text-[#e7d8c9]"
                />
              </div>
            ))}
            <button
              onClick={() => void saveMidas()}
              className="px-4 py-2 rounded-lg bg-black border border-[#261e1a] text-xs text-[#d4a373] hover:border-[#d97706]"
            >
              Save MIDAS Score
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {HIT6_QUESTIONS.map((q, idx) => (
              <div
                key={q}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black border border-[#261e1a]"
              >
                <span className="text-[11px] text-[#a8a29e]">{q}</span>
                <select
                  value={hit6Answers[idx]}
                  onChange={(e) => {
                    const next = [...hit6Answers];
                    next[idx] = Number(e.target.value);
                    setHit6Answers(next);
                  }}
                  className="bg-[#0a0a0a] border border-[#261e1a] rounded-lg px-2 py-1 text-xs text-[#e7d8c9]"
                >
                  {HIT6_CHOICES.map((c) => (
                    <option key={c.label} value={c.val}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button
              onClick={() => void saveHit6()}
              className="px-4 py-2 rounded-lg bg-black border border-[#261e1a] text-xs text-[#d4a373] hover:border-[#d97706]"
            >
              Save HIT-6 Score
            </button>
          </div>
        )}

        {savedScore && <p className="text-xs text-[#d97706]">{savedScore}</p>}
      </section>
    </div>
  );
}
