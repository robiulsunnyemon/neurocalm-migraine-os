"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, FileText } from "lucide-react";
import { db } from "@/db/dexie";
import { calculateMidasScore } from "@/lib/clinical/assessments";
import { generateClinicalPdf } from "@/lib/pdf/clinicalReport";

const MIDAS_QUESTIONS = [
  "Days missed work/school due to headache (last 3 months)",
  "Days productivity reduced by >=50% at work/school",
  "Days unable to do household work",
  "Days household productivity reduced by >=50%",
  "Days missed family, social, or leisure activities",
];

export default function ReportPage() {
  const dailyLogs = useLiveQuery(() => db.dailyLogs.toArray(), []) ?? [];
  const attacks =
    useLiveQuery(() => db.attacks.orderBy("startedAt").reverse().toArray(), []) ?? [];
  const medications = useLiveQuery(() => db.medications.toArray(), []) ?? [];
  const assessments =
    useLiveQuery(
      () => db.assessments.orderBy("completedAt").reverse().toArray(),
      []
    ) ?? [];

  const [answers, setAnswers] = useState<number[]>([0, 0, 0, 0, 0]);
  const [savedScore, setSavedScore] = useState<string | null>(null);

  async function saveMidas() {
    const { score, grade } = calculateMidasScore(answers);
    await db.assessments.put({
      id: crypto.randomUUID(),
      type: "MIDAS",
      score,
      severityLabel: grade,
      answers,
      completedAt: new Date().toISOString(),
      synced: false,
    });
    setSavedScore(`Saved MIDAS: ${score} (${grade})`);
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
      {/* 1-Click Clinical PDF Export */}
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-[#d4a373] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#d97706]" />
              Neurologist & Insurance PDF Pack
            </h1>
            <p className="text-[11px] text-[#78716c] mt-0.5">
              1-page clinical summary with MIDAS, MOH limits, and failed therapies for Prior Authorization.
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadPdf}
          className="w-full py-3 rounded-xl bg-[#14110f] border border-[#d97706]/60 text-xs font-semibold text-[#d97706] flex items-center justify-center gap-2 hover:bg-[#1f1914] transition"
        >
          <Download className="w-4 h-4" />
          <span>Download 1-Page Clinical PDF</span>
        </button>
      </section>

      {/* MIDAS Assessment */}
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#d4a373]">
          MIDAS Disability Assessment (3-Month Recall)
        </h2>

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
                value={answers[idx]}
                onChange={(e) => {
                  const next = [...answers];
                  next[idx] = Math.max(0, Number(e.target.value) || 0);
                  setAnswers(next);
                }}
                className="w-16 bg-[#0a0a0a] border border-[#261e1a] rounded-lg px-2 py-1 text-xs text-center text-[#e7d8c9]"
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => void saveMidas()}
          className="px-4 py-2 rounded-lg bg-black border border-[#261e1a] text-xs text-[#d4a373] hover:border-[#d97706]"
        >
          Calculate & Save MIDAS
        </button>

        {savedScore && (
          <p className="text-xs text-[#d97706]">{savedScore}</p>
        )}
      </section>
    </div>
  );
}
