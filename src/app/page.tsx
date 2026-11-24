"use client";

import React, { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  Check,
  CloudRain,
  Mic,
  MicOff,
  Pill,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { db } from "@/db/dexie";
import { computeMohStatus } from "@/lib/clinical/assessments";
import type {
  BaselineStatus,
  MedicationCategory,
  MigraineSymptom,
  PainLocation,
} from "@/types/migraine";

interface WeatherSnapshot {
  currentPressureHpa: number;
  delta24hHpa: number;
  maxDropNext24hHpa: number;
  stormAlert: boolean;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function BlackoutHomePage() {
  const [today, setToday] = useState("");
  const dailyLog = useLiveQuery(
    () => (today ? db.dailyLogs.get(today) : undefined),
    [today]
  );
  const allMeds = useLiveQuery(() => db.medications.toArray(), []) ?? [];
  const todayAttacks =
    useLiveQuery(
      () =>
        today
          ? db.attacks.where("dailyLogId").equals(today).toArray()
          : ([] as import("@/types/migraine").MigraineAttack[]),
      [today]
    ) ?? [];

  useEffect(() => {
    setToday(getTodayKey());
  }, []);

  const moh = computeMohStatus(allMeds, today ? today.slice(0, 7) : "");

  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!today) return;
    let active = true;
    async function loadWeather() {
      try {
        const res = await fetch("/api/weather");
        if (!res.ok) return;
        const data = (await res.json()) as WeatherSnapshot & { unavailable?: boolean };
        if (!active || data.unavailable || typeof data.currentPressureHpa !== "number") return;
        setWeather(data);
        // Save pressure to today's log if present or create baseline
        const existing = await db.dailyLogs.get(today);
        if (existing) {
          await db.dailyLogs.update(today, {
            barometricPressureHpa: data.currentPressureHpa,
            pressureDelta24h: data.delta24hHpa,
          });
        }
      } catch {
        // Offline - ignore silently
      }
    }
    loadWeather();
    return () => {
      active = false;
    };
  }, [today]);

  function flash(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  }

  async function setBaseline(status: BaselineStatus) {
    if (!today) return;
    const now = new Date().toISOString();
    const existing = await db.dailyLogs.get(today);
    await db.dailyLogs.put({
      ...(existing ?? { id: today, date: today }),
      baselineStatus: status,
      barometricPressureHpa: weather?.currentPressureHpa ?? existing?.barometricPressureHpa,
      pressureDelta24h: weather?.delta24hHpa ?? existing?.pressureDelta24h,
      updatedAt: now,
      synced: false,
    });
    flash(`Today marked: ${status.replace("_", " ")}`);
  }

  async function quickLogAttack(pain: number) {
    if (!today) return;
    const now = new Date().toISOString();
    const existing = await db.dailyLogs.get(today);
    if (!existing) {
      await db.dailyLogs.put({
        id: today,
        date: today,
        baselineStatus: pain >= 7 ? "bedbound" : "functioning",
        barometricPressureHpa: weather?.currentPressureHpa,
        pressureDelta24h: weather?.delta24hHpa,
        updatedAt: now,
        synced: false,
      });
    }
    await db.attacks.put({
      id: crypto.randomUUID(),
      dailyLogId: today,
      startedAt: now,
      peakPain: pain,
      locations: [],
      symptoms: ["photophobia"],
      updatedAt: now,
      synced: false,
    });
    flash(`Logged attack (Pain ${pain}/10)`);
  }

  async function quickLogMedication(
    name: string,
    category: MedicationCategory
  ) {
    if (!today) return;
    const now = new Date().toISOString();
    const existing = await db.dailyLogs.get(today);
    if (!existing) {
      await db.dailyLogs.put({
        id: today,
        date: today,
        baselineStatus: "functioning",
        updatedAt: now,
        synced: false,
      });
    }
    await db.medications.put({
      id: crypto.randomUUID(),
      dailyLogId: today,
      takenAt: now,
      name,
      category,
      updatedAt: now,
      synced: false,
    });
    flash(`Logged ${name}`);
  }

  async function parseAndSaveVoice(transcript: string) {
    if (!transcript.trim() || !today) return;
    try {
      const res = await fetch("/api/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) throw new Error("Parse failed");
      const parsed = (await res.json()) as {
        peakPain: number;
        locations: PainLocation[];
        symptoms: MigraineSymptom[];
        medication?: { name: string; category: MedicationCategory };
      };

      const now = new Date().toISOString();
      const existing = await db.dailyLogs.get(today);
      await db.dailyLogs.put({
        ...(existing ?? { id: today, date: today }),
        baselineStatus: parsed.peakPain >= 7 ? "bedbound" : "functioning",
        barometricPressureHpa: weather?.currentPressureHpa,
        pressureDelta24h: weather?.delta24hHpa,
        updatedAt: now,
        synced: false,
      });

      const attackId = crypto.randomUUID();
      await db.attacks.put({
        id: attackId,
        dailyLogId: today,
        startedAt: now,
        peakPain: parsed.peakPain,
        locations: parsed.locations,
        symptoms: parsed.symptoms,
        voiceTranscript: transcript,
        updatedAt: now,
        synced: false,
      });

      if (parsed.medication) {
        await db.medications.put({
          id: crypto.randomUUID(),
          attackId,
          dailyLogId: today,
          takenAt: now,
          name: parsed.medication.name,
          category: parsed.medication.category,
          updatedAt: now,
          synced: false,
        });
      }

      setVoiceText("");
      flash(
        `Voice saved: Pain ${parsed.peakPain}/10${
          parsed.medication ? ` + ${parsed.medication.name}` : ""
        }`
      );
    } catch {
      flash("Could not parse voice input");
    }
  }

  function startVoiceCapture() {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRec) {
      flash("Voice API unsupported here — type below instead");
      return;
    }

    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    setListening(true);
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setVoiceText(transcript);
      setListening(false);
      void parseAndSaveVoice(transcript);
    };
    rec.onerror = () => {
      setListening(false);
      flash("Microphone error — you can type below");
    };
    rec.onend = () => setListening(false);
    rec.start();
  }

  const baselineOptions: {
    id: BaselineStatus;
    label: string;
    sub: string;
    accent: string;
  }[] = [
    {
      id: "pain_free",
      label: "Pain-Free",
      sub: "Good baseline day",
      accent: "border-[#15803d]/50 text-[#4ade80]/80",
    },
    {
      id: "background",
      label: "Background",
      sub: "Mild chronic noise",
      accent: "border-[#78716c]/50 text-[#d4a373]",
    },
    {
      id: "functioning",
      label: "Functioning",
      sub: "Moderate migraine",
      accent: "border-[#d97706]/60 text-[#f59e0b]/90",
    },
    {
      id: "bedbound",
      label: "Bedbound",
      sub: "Severe / dark room",
      accent: "border-[#b91c1c]/70 text-[#ef4444]/90",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Storm & Barometric Alert Banner */}
      {weather && (
        <div
          className={`rounded-xl p-3 border flex items-center justify-between text-xs ${
            weather.stormAlert
              ? "bg-[#1a0505] border-[#b91c1c]/60 text-[#fca5a5]/85"
              : "bg-[#0a0a0a] border-[#261e1a] text-[#a8a29e]"
          }`}
        >
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-[#d97706] shrink-0" />
            <div>
              <span className="font-medium text-[#d4a373]">
                {weather.currentPressureHpa} hPa
              </span>{" "}
              (24h: {weather.delta24hHpa > 0 ? `+${weather.delta24hHpa}` : weather.delta24hHpa} hPa)
              {weather.stormAlert && (
                <p className="text-[11px] text-[#f87171]/80 mt-0.5">
                  Pressure drop ({weather.maxDropNext24hHpa} hPa) forecast in 24h — keep meds ready.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div className="rounded-lg bg-[#14110f] border border-[#d97706]/50 px-3 py-2 text-xs text-[#d97706] flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Killer Feature 1: Eyes-Closed Voice-to-Log */}
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-[#d4a373] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#d97706]" />
            3-Second Voice Log
          </h1>
          <span className="text-[11px] text-[#78716c]">Eyes-closed capture</span>
        </div>

        <button
          onClick={startVoiceCapture}
          className={`w-full py-5 rounded-xl border flex flex-col items-center justify-center gap-2 transition ${
            listening
              ? "bg-[#1a0505] border-[#b91c1c] text-[#ef4444]"
              : "bg-black border-[#261e1a] hover:border-[#d97706]/60 text-[#d4a373]"
          }`}
        >
          {listening ? (
            <MicOff className="w-7 h-7 animate-pulse" />
          ) : (
            <Mic className="w-7 h-7 text-[#d97706]" />
          )}
          <span className="text-xs font-medium">
            {listening
              ? "Listening... speak pain, side, & meds"
              : "Tap & say: “Pain 7, left side, nausea, took sumatriptan”"}
          </span>
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
            placeholder="Or type quick note (e.g. pain 8, aura, nurtec)..."
            className="flex-1 bg-black border border-[#261e1a] rounded-lg px-3 py-2 text-xs text-[#e7d8c9] placeholder:text-[#57534e] focus:outline-none focus:border-[#d97706]"
          />
          <button
            onClick={() => void parseAndSaveVoice(voiceText)}
            className="px-3 py-2 rounded-lg bg-[#14110f] border border-[#261e1a] text-xs text-[#d97706] hover:border-[#d97706]"
          >
            Save
          </button>
        </div>
      </section>

      {/* Killer Feature 2: 1-Tap Chronic Baseline */}
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#d4a373]">
            Today&apos;s Baseline ({today})
          </h2>
          {todayAttacks.length > 0 && (
            <span className="text-[11px] text-[#ef4444]/85">
              {todayAttacks.length} spike(s) today
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {baselineOptions.map((opt) => {
            const selected = dailyLog?.baselineStatus === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => void setBaseline(opt.id)}
                className={`p-3 rounded-xl border text-left transition ${
                  selected
                    ? `${opt.accent} bg-[#14110f]`
                    : "border-[#261e1a] bg-black text-[#a8a29e] hover:border-[#44403c]"
                }`}
              >
                <div className="text-xs font-semibold">{opt.label}</div>
                <div className="text-[10px] text-[#78716c] mt-0.5">{opt.sub}</div>
              </button>
            );
          })}
        </div>

        {/* 1-Tap Attack Severity Spikes */}
        <div className="pt-2 border-t border-[#261e1a] flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#78716c]">Quick Spike:</span>
          <div className="flex gap-2">
            {[4, 6, 8, 10].map((lvl) => (
              <button
                key={lvl}
                onClick={() => void quickLogAttack(lvl)}
                className="px-3 py-1.5 rounded-lg bg-black border border-[#261e1a] text-xs text-[#d4a373] hover:border-[#b91c1c]"
              >
                {lvl}/10
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Medication Safety Guardrail (MOH Counter) */}
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#d4a373] flex items-center gap-1.5">
            <Pill className="w-4 h-4 text-[#d97706]" />
            Medication Safety (This Month)
          </h2>
          {moh.triptanWarning && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a0505] border border-[#b91c1c] text-[#fca5a5] flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> MOH Limit Near
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-black border border-[#261e1a]">
            <div className="text-base font-semibold text-[#d97706]">
              {moh.triptanDaysThisMonth}/10
            </div>
            <div className="text-[10px] text-[#78716c]">Triptan Days</div>
          </div>
          <div className="p-2.5 rounded-xl bg-black border border-[#261e1a]">
            <div className="text-base font-semibold text-[#4ade80]/80">
              {moh.gepantDaysThisMonth}
            </div>
            <div className="text-[10px] text-[#78716c]">CGRP / Gepant</div>
          </div>
          <div className="p-2.5 rounded-xl bg-black border border-[#261e1a]">
            <div className="text-base font-semibold text-[#d4a373]">
              {moh.nsaidDaysThisMonth}/15
            </div>
            <div className="text-[10px] text-[#78716c]">NSAID Days</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void quickLogMedication("Sumatriptan", "triptan")}
            className="text-xs px-3 py-1.5 rounded-lg bg-black border border-[#261e1a] hover:border-[#d97706]"
          >
            + Sumatriptan
          </button>
          <button
            onClick={() => void quickLogMedication("Nurtec ODT", "gepant_cgrp")}
            className="text-xs px-3 py-1.5 rounded-lg bg-black border border-[#261e1a] hover:border-[#d97706]"
          >
            + Nurtec (CGRP)
          </button>
          <button
            onClick={() => void quickLogMedication("Ibuprofen", "nsaid")}
            className="text-xs px-3 py-1.5 rounded-lg bg-black border border-[#261e1a] hover:border-[#d97706]"
          >
            + Ibuprofen
          </button>
        </div>

        {moh.triptanWarning && (
          <p className="text-[11px] text-[#fca5a5]/80 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Using triptans &gt;10 days/month can trigger Medication Overuse Headache.
          </p>
        )}
      </section>
    </div>
  );
}
