import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "firebase/ai";
import { getFirebaseClient } from "@/lib/firebase/client";
import type {
  MedicationCategory,
  MigraineSymptom,
  PainLocation,
} from "@/types/migraine";

export interface ParsedMigraineVoice {
  peakPain: number;
  locations: PainLocation[];
  symptoms: MigraineSymptom[];
  triggers: string[];
  sleepHours?: number;
  medication?: {
    name: string;
    category: MedicationCategory;
    dosage?: string;
  };
  parsedBy: "firebase_ai" | "offline_nlp";
}

const migraineVoiceSchema = Schema.object({
  properties: {
    peakPain: Schema.integer({
      description: "Estimated headache pain severity from 1 to 10",
    }),
    locations: Schema.array({
      items: Schema.enumString({
        enum: ["left", "right", "bilateral", "neck", "eye", "sinus"],
      }),
    }),
    symptoms: Schema.array({
      items: Schema.enumString({
        enum: [
          "aura",
          "nausea",
          "photophobia",
          "phonophobia",
          "brain_fog",
          "dizziness",
        ],
      }),
    }),
    triggers: Schema.array({
      items: Schema.string({
        description:
          "Short snake_case trigger tags mentioned (e.g. caffeine, dehydration, skipped_meal, screen_time, lack_of_sleep, stress, hormones)",
      }),
    }),
    sleepHours: Schema.integer({
      description: "Hours of sleep if mentioned, otherwise 0",
    }),
    medicationName: Schema.string({
      description: "Medication name if taken, otherwise empty string",
    }),
    medicationDosage: Schema.string({
      description: "Medication dosage if mentioned (e.g. 50mg), otherwise empty string",
    }),
    medicationCategory: Schema.enumString({
      enum: ["triptan", "gepant_cgrp", "nsaid", "preventive", "other", "none"],
    }),
  },
  optionalProperties: ["sleepHours", "medicationDosage"],
});

/**
 * Parses natural-language voice notes (English, Bengali, or mixed) using Firebase AI Logic (Gemini).
 * Automatically falls back to the offline deterministic parser if offline or if Firebase AI Logic is unavailable.
 */
export async function parseVoiceWithFirebaseAI(
  transcript: string
): Promise<ParsedMigraineVoice> {
  const { app } = getFirebaseClient();

  if (app && typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const ai = getAI(app, { backend: new GoogleAIBackend() });
      const model = getGenerativeModel(ai, {
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: migraineVoiceSchema,
        },
      });

      const prompt = `You are a clinical migraine log parser. Extract structured migraine attack data from this patient's voice note (which may be in English, Bengali, or mixed). If pain isn't explicitly numbered, infer 1-10 from severity words (mild=3, moderate=6, severe=8). Voice note: "${transcript}"`;

      const result = await model.generateContent(prompt);
      const raw = JSON.parse(result.response.text()) as {
        peakPain: number;
        locations: PainLocation[];
        symptoms: MigraineSymptom[];
        triggers: string[];
        sleepHours?: number;
        medicationName: string;
        medicationDosage?: string;
        medicationCategory: MedicationCategory | "none";
      };

      return {
        peakPain: Math.min(10, Math.max(1, raw.peakPain || 6)),
        locations: raw.locations ?? [],
        symptoms: raw.symptoms ?? [],
        triggers: (raw.triggers ?? []).map((t) =>
          t.toLowerCase().replace(/\s+/g, "_")
        ),
        sleepHours:
          raw.sleepHours && raw.sleepHours > 0 ? raw.sleepHours : undefined,
        medication:
          raw.medicationName && raw.medicationCategory !== "none"
            ? {
                name: raw.medicationName,
                category: raw.medicationCategory,
                dosage: raw.medicationDosage || undefined,
              }
            : undefined,
        parsedBy: "firebase_ai",
      };
    } catch {
      // Fallback gracefully to local/server deterministic parser
    }
  }

  const res = await fetch("/api/parse-voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });

  if (!res.ok) {
    return {
      peakPain: 6,
      locations: [],
      symptoms: [],
      triggers: [],
      parsedBy: "offline_nlp",
    };
  }

  const fallback = (await res.json()) as Omit<
    ParsedMigraineVoice,
    "triggers" | "parsedBy"
  >;
  return {
    ...fallback,
    triggers: [],
    parsedBy: "offline_nlp",
  };
}

/**
 * Generates a short, empathetic clinical pattern summary using Firebase AI Logic (Gemini).
 */
export async function generatePatternSummaryWithAI(
  summaryPayload: string
): Promise<string | null> {
  const { app } = getFirebaseClient();
  if (!app || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return null;
  }

  try {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
    const result = await model.generateContent(
      `You are a concise, empathetic migraine specialist assistant. Based on this patient's statistical correlation data, give 2 short, actionable bullet points (max 50 words total) without diagnosing:\n${summaryPayload}`
    );
    return result.response.text().trim();
  } catch {
    return null;
  }
}
