"use client";

import React, { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  Check,
  CloudRain,
  MapPin,
  Mic,
  MicOff,
  Pill,
  Plus,
  ShieldAlert,
  Sparkles,
  Tag,
} from "lucide-react";
import {
  db,
  ensureDefaultCustomMeds,
  getOrCreatePreferences,
} from "@/db/dexie";
import { computeMohStatus } from "@/lib/clinical/assessments";
import { parseVoiceWithFirebaseAI } from "@/lib/firebase/ai";
import type {
  BaselineStatus,
  MedicationCategory,
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

function formatTriggerLabel(trig: string): string {
  return trig
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
  const customMeds = useLiveQuery(() => db.customMeds.toArray(), []) ?? [];
  const prefs = useLiveQuery(() => db.preferences.get("default"), []);
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
    void getOrCreatePreferences();
    void ensureDefaultCustomMeds();
  }, []);

  const moh = computeMohStatus(allMeds, today ? today.slice(0, 7) : "");

  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [listening, setListening] = useState(false);
  const [parsingVoice, setParsingVoice] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showAddMed, setShowAddMed] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedCat, setNewMedCat] = useState<MedicationCategory>("triptan");

  const [newTrigger, setNewTrigger] = useState("");

  useEffect(() => {
    if (!today) return;
    let active = true;
    async function loadWeather() {
      try {
        const query =
          prefs?.latitude && prefs?.longitude
            ? `?lat=${prefs.latitude}&lon=${prefs.longitude}`
            : "";
        const res = await fetch(`/api/weather${query}`);
        if (!res.ok) return;
        const data = (await res.json()) as WeatherSnapshot & {
          unavailable?: boolean;
        };
        if (
          !active ||
          data.unavailable ||
          typeof data.currentPressureHpa !== "number"
        ) {
          return;
        }
        setWeather(data);
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
    void loadWeather();
    return () => {
      active = false;
    };
  }, [today, prefs?.latitude, prefs?.longitude]);

  function flash(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  function requestUserLocation() {
    if (!navigator.geolocation) {
      flash("Geolocation not supported in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const currentPrefs = await getOrCreatePreferences();
        await db.preferences.put({
          ...currentPrefs,
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
          locationLabel: "Local GPS",
        });
        flash("Local barometric pressure enabled");
      },
      () => flash("Location permission denied")
    );
  }

  async function setBaseline(status: BaselineStatus) {
    if (!today) return;
    const now = new Date().toISOString();
    const existing = await db.dailyLogs.get(today);
    await db.dailyLogs.put({
      ...(existing ?? { id: today, date: today }),
      baselineStatus: status,
      barometricPressureHpa:
        weather?.currentPressureHpa ?? existing?.barometricPressureHpa,
      pressureDelta24h: weather?.delta24hHpa ?? existing?.pressureDelta24h,
      updatedAt: now,
      synced: false,
    });
    flash(`Logged: ${formatTriggerLabel(status)}`);
  }

  async function toggleTodayTrigger(trig: string) {
    if (!today) return;
    const now = new Date().toISOString();
    const existing = await db.dailyLogs.get(today);
    const current = existing?.triggers ?? [];
    const next = current.includes(trig)
      ? current.filter((t) => t !== trig)
      : [...current, trig];

    await db.dailyLogs.put({
      ...(existing ?? { id: today, date: today, baselineStatus: "pain_free" }),
      triggers: next,
      updatedAt: now,
      synced: false,
    });
  }

  async function addCustomTrigger() {
    const clean = newTrigger.trim().toLowerCase().replace(/\s+/g, "_");
    if (!clean) return;
    const currentPrefs = await getOrCreatePreferences();
    if (!currentPrefs.customTriggers.includes(clean)) {
      await db.preferences.put({
        ...currentPrefs,
        customTriggers: [...currentPrefs.customTriggers, clean],
      });
    }
    setNewTrigger("");
    await toggleTodayTrigger(clean);
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
    category: MedicationCategory,
    dosage?: string
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
      dosage,
      category,
      updatedAt: now,
      synced: false,
    });
    flash(`Logged ${name}${dosage ? ` ${dosage}` : ""}`);
  }

  async function addCustomMedication() {
    if (!newMedName.trim()) return;
    await db.customMeds.put({
      id: crypto.randomUUID(),
      name: newMedName.trim(),
      dosage: newMedDosage.trim() || undefined,
      category: newMedCat,
    });
    setNewMedName("");
    setNewMedDosage("");
    setShowAddMed(false);
    flash("Added custom medication");
  }

  async function parseAndSaveVoice(transcript: string) {
    if (!transcript.trim() || !today) return;
    setParsingVoice(true);
    try {
      const parsed = await parseVoiceWithFirebaseAI(transcript);
      const now = new Date().toISOString();
      const existing = await db.dailyLogs.get(today);
      const mergedTriggers = Array.from(
        new Set([...(existing?.triggers ?? []), ...parsed.triggers])
      );

      await db.dailyLogs.put({
        ...(existing ?? { id: today, date: today }),
        baselineStatus: parsed.peakPain >= 7 ? "bedbound" : "functioning",
        sleepHours: parsed.sleepHours ?? existing?.sleepHours,
        triggers: mergedTriggers,
        barometricPressureHpa:
          weather?.currentPressureHpa ?? existing?.barometricPressureHpa,
        pressureDelta24h: weather?.delta24hHpa ?? existing?.pressureDelta24h,
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
        parsedBy: parsed.parsedBy,
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
          dosage: parsed.medication.dosage,
          category: parsed.medication.category,
          updatedAt: now,
          synced: false,
        });
      }

      setVoiceText("");
      flash(
        `${
          parsed.parsedBy === "firebase_ai" ? "Gemini AI" : "Offline NLP"
        }: Pain ${parsed.peakPain}/10${
          parsed.medication ? ` + ${parsed.medication.name}` : ""
        }`
      );
    } catch {
      flash("Could not parse voice input");
    } finally {
      setParsingVoice(false);
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
      sub: "No headache today",
      accent: "border-[#15803d]/50 text-[#4ade80]/80",
    },
    {
      id: "background",
      label: "Mild / Background",
      sub: "Low pain, manageable",
      accent: "border-[#78716c]/50 text-[#d4a373]",
    },
    {
      id: "functioning",
      label: "Moderate",
      sub: "Painful, still functioning",
      accent: "border-[#d97706]/60 text-[#f59e0b]/90",
    },
    {
      id: "bedbound",
      label: "Severe / Bedbound",
      sub: "Need dark room",
      accent: "border-[#b91c1c]/70 text-[#ef4444]/90",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Storm & Barometric Alert Banner with Auto-Location */}
      <div
        className={`rounded-xl p-3 border flex items-center justify-between text-xs ${
          weather?.stormAlert
            ? "bg-[#1a0505] border-[#b91c1c]/60 text-[#fca5a5]/85"
            : "bg-[#0a0a0a] border-[#261e1a] text-[#a8a29e]"
        }`}
      >
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-[#d97706] shrink-0" />
          {weather ? (
            <div>
              <span className="font-medium text-[#d4a373]">
                {weather.stormAlert
                  ? `Pressure Drop Ahead (${weather.maxDropNext24hHpa} hPa)`
                  : `Steady Pressure (${weather.currentPressureHpa} hPa)`}
              </span>
              {weather.stormAlert && (
                <p className="text-[11px] text-[#f87171]/80 mt-0.5">
                  Higher migraine risk in 24h • Hydrate &amp; keep meds close
                </p>
              )}
            </div>
          ) : (
            <span>Checking local pressure...</span>
          )}
        </div>
        <button
          onClick={requestUserLocation}
          className="flex items-center gap-1 px-2 py-1 rounded bg-black border border-[#261e1a] text-[10px] text-[#d4a373] hover:border-[#d97706]"
          title="Use your local GPS coordinates for pressure"
        >
          <MapPin className="w-3 h-3 text-[#d97706]" />
          <span>{prefs?.locationLabel ?? "Set GPS"}</span>
        </button>
      </div>

      {feedback && (
        <div className="rounded-lg bg-[#14110f] border border-[#d97706]/50 px-3 py-2 text-xs text-[#d97706] flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Killer Feature 1: Hands-Free Voice-to-Log */}
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-[#d4a373] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#d97706]" />
            Hands-Free Voice Log
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#14110f] border border-[#261e1a] text-[#d97706]">
            Smart Parse
          </span>
        </div>

        <button
          onClick={startVoiceCapture}
          disabled={parsingVoice}
          className={`w-full py-5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
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
          <span className="text-xs font-semibold">
            {parsingVoice
              ? "Parsing your log..."
              : listening
              ? "Listening..."
              : "Tap & speak"}
          </span>
          {!listening && !parsingVoice && (
            <span className="text-[11px] text-[#78716c] px-3 text-center">
              e.g. &ldquo;Pain 7, left eye, took sumatriptan&rdquo;
            </span>
          )}
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
            placeholder="Type what you feel..."
            className="flex-1 bg-black border border-[#261e1a] rounded-lg px-3 py-2 text-xs text-[#e7d8c9] placeholder:text-[#57534e] focus:outline-none focus:border-[#d97706]"
          />
          <button
            onClick={() => void parseAndSaveVoice(voiceText)}
            disabled={parsingVoice}
            className="px-3.5 py-2 rounded-lg bg-[#14110f] border border-[#261e1a] text-xs text-[#d97706] hover:border-[#d97706]"
          >
            {parsingVoice ? "..." : "Log"}
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

      {/* Custom Triggers Quick-Tap */}
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#d4a373] flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-[#d97706]" />
          Today&apos;s Triggers
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {(prefs?.customTriggers ?? []).map((trig) => {
            const active = (dailyLog?.triggers ?? []).includes(trig);
            return (
              <button
                key={trig}
                onClick={() => void toggleTodayTrigger(trig)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                  active
                    ? "bg-[#14110f] border-[#d97706] text-[#d97706]"
                    : "bg-black border-[#261e1a] text-[#a8a29e]"
                }`}
              >
                {formatTriggerLabel(trig)}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTrigger}
            onChange={(e) => setNewTrigger(e.target.value)}
            placeholder="Add trigger (e.g. chocolate)..."
            className="flex-1 bg-black border border-[#261e1a] rounded-lg px-3 py-1.5 text-xs text-[#e7d8c9]"
          />
          <button
            onClick={() => void addCustomTrigger()}
            className="px-3 py-1.5 rounded-lg bg-black border border-[#261e1a] text-xs text-[#d4a373] hover:border-[#d97706]"
          >
            + Add
          </button>
        </div>
      </section>

      {/* Medication Safety Guardrail (Custom Meds + MOH Counter) */}
      <section className="rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#d4a373] flex items-center gap-1.5">
            <Pill className="w-4 h-4 text-[#d97706]" />
            Monthly Med Limits
          </h2>
          {moh.triptanWarning && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a0505] border border-[#b91c1c] text-[#fca5a5] flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Near Limit
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
          {customMeds.map((med) => (
            <button
              key={med.id}
              onClick={() =>
                void quickLogMedication(med.name, med.category, med.dosage)
              }
              className="text-xs px-3 py-1.5 rounded-lg bg-black border border-[#261e1a] hover:border-[#d97706]"
            >
              + {med.name} {med.dosage ? `(${med.dosage})` : ""}
            </button>
          ))}
          <button
            onClick={() => setShowAddMed(!showAddMed)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-[#14110f] border border-[#261e1a] text-[#d97706] flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Custom Med
          </button>
        </div>

        {showAddMed && (
          <div className="p-3 rounded-xl bg-black border border-[#261e1a] space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Med name (e.g. Ubrelvy)"
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                className="bg-[#0a0a0a] border border-[#261e1a] rounded-lg px-2.5 py-1.5 text-xs text-[#e7d8c9]"
              />
              <input
                type="text"
                placeholder="Dosage (e.g. 100mg)"
                value={newMedDosage}
                onChange={(e) => setNewMedDosage(e.target.value)}
                className="bg-[#0a0a0a] border border-[#261e1a] rounded-lg px-2.5 py-1.5 text-xs text-[#e7d8c9]"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={newMedCat}
                onChange={(e) =>
                  setNewMedCat(e.target.value as MedicationCategory)
                }
                className="flex-1 bg-[#0a0a0a] border border-[#261e1a] rounded-lg px-2.5 py-1.5 text-xs text-[#e7d8c9]"
              >
                <option value="triptan">Triptan</option>
                <option value="gepant_cgrp">Gepant / CGRP</option>
                <option value="nsaid">NSAID</option>
                <option value="preventive">Preventive</option>
                <option value="other">Other</option>
              </select>
              <button
                onClick={() => void addCustomMedication()}
                className="px-3 py-1.5 rounded-lg bg-[#14110f] border border-[#d97706]/50 text-xs text-[#d97706]"
              >
                Save Med
              </button>
            </div>
          </div>
        )}

        {moh.triptanWarning && (
          <p className="text-[11px] text-[#fca5a5]/80 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            10+ triptan days/mo can cause rebound headaches.
          </p>
        )}
      </section>
    </div>
  );
}
