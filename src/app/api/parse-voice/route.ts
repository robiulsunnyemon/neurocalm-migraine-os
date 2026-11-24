import { NextResponse } from "next/server";
import { z } from "zod";
import type {
  MedicationCategory,
  MigraineSymptom,
  PainLocation,
} from "@/types/migraine";

const VoiceInputSchema = z.object({
  transcript: z.string().min(1).max(1000),
});

interface ParsedVoiceResult {
  peakPain: number;
  locations: PainLocation[];
  symptoms: MigraineSymptom[];
  medication?: {
    name: string;
    category: MedicationCategory;
  };
}

function deterministicParse(text: string): ParsedVoiceResult {
  const lower = text.toLowerCase();

  // Extract pain level 1-10
  let peakPain = 6;
  const painMatch = lower.match(/(?:pain|level|severity|rate)?\s*(\b[1-9]|10\b)(?:\s*\/\s*10)?/);
  if (painMatch) {
    peakPain = Math.min(10, Math.max(1, Number(painMatch[1])));
  } else if (lower.includes("severe") || lower.includes("awful") || lower.includes("terrible")) {
    peakPain = 8;
  } else if (lower.includes("mild")) {
    peakPain = 3;
  }

  const locations: PainLocation[] = [];
  if (lower.includes("left")) locations.push("left");
  if (lower.includes("right")) locations.push("right");
  if (lower.includes("both") || lower.includes("bilateral") || lower.includes("all over")) {
    locations.push("bilateral");
  }
  if (lower.includes("neck")) locations.push("neck");
  if (lower.includes("eye")) locations.push("eye");
  if (lower.includes("sinus") || lower.includes("forehead")) locations.push("sinus");

  const symptoms: MigraineSymptom[] = [];
  if (lower.includes("aura") || lower.includes("zigzag") || lower.includes("vision")) {
    symptoms.push("aura");
  }
  if (lower.includes("nausea") || lower.includes("nauseous") || lower.includes("vomit")) {
    symptoms.push("nausea");
  }
  if (lower.includes("light") || lower.includes("photophobia")) {
    symptoms.push("photophobia");
  }
  if (lower.includes("sound") || lower.includes("noise") || lower.includes("phonophobia")) {
    symptoms.push("phonophobia");
  }
  if (lower.includes("fog") || lower.includes("confused")) {
    symptoms.push("brain_fog");
  }
  if (lower.includes("dizzy") || lower.includes("vertigo")) {
    symptoms.push("dizziness");
  }

  let medication: ParsedVoiceResult["medication"];
  const medCatalog: { keywords: string[]; name: string; category: MedicationCategory }[] = [
    { keywords: ["sumatriptan", "imitrex"], name: "Sumatriptan", category: "triptan" },
    { keywords: ["rizatriptan", "maxalt"], name: "Rizatriptan", category: "triptan" },
    { keywords: ["eletriptan", "relpax"], name: "Eletriptan", category: "triptan" },
    { keywords: ["zolmitriptan", "zomig"], name: "Zolmitriptan", category: "triptan" },
    { keywords: ["nurtec", "rimegepant"], name: "Nurtec ODT", category: "gepant_cgrp" },
    { keywords: ["ubrelvy", "ubrogepant"], name: "Ubrelvy", category: "gepant_cgrp" },
    { keywords: ["ibuprofen", "advil", "motrin"], name: "Ibuprofen", category: "nsaid" },
    { keywords: ["naproxen", "aleve"], name: "Naproxen", category: "nsaid" },
    { keywords: ["excedrin"], name: "Excedrin", category: "nsaid" },
    { keywords: ["tylenol", "acetaminophen"], name: "Acetaminophen", category: "other" },
  ];

  for (const med of medCatalog) {
    if (med.keywords.some((k) => lower.includes(k))) {
      medication = { name: med.name, category: med.category };
      break;
    }
  }

  return { peakPain, locations, symptoms, medication };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = VoiceInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid transcript" }, { status: 400 });
    }

    const result = deterministicParse(parsed.data.transcript);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to parse voice input" }, { status: 500 });
  }
}
