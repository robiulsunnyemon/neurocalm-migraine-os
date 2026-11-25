import React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Calendar,
  CloudLightning,
  CloudRain,
  FileText,
  Lock,
  Mic,
  Pill,
  WifiOff,
} from "lucide-react";
import { InstallPwaButton } from "@/components/InstallPwaButton";
import {
  MobileMockupFrame,
  type MockupScreenId,
} from "@/components/MobileMockupFrame";

interface WalkthroughSection {
  id: string;
  screen: MockupScreenId;
  badge: string;
  title: string;
  whatItDoes: string;
  howToUse: string[];
  example: string;
  icon: React.ComponentType<{ className?: string }>;
}

const WALKTHROUGHS: WalkthroughSection[] = [
  {
    id: "pressure",
    screen: "pressure",
    badge: "Section 1 • Weather Shield",
    title: "Storm & Barometric Pressure Alert",
    whatItDoes:
      "Tracks local surface air pressure automatically and warns you 24 hours before a sharp drop (>=5 hPa) hits.",
    howToUse: [
      "Tap 'Set GPS' once in the top banner to lock your local coordinates.",
      "Check the banner each morning — it turns dim crimson if a drop is ahead.",
    ],
    example:
      "If tomorrow's forecast shows -5.1 hPa, hydrate early and keep rescue meds within reach before the storm arrives.",
    icon: CloudRain,
  },
  {
    id: "voice",
    screen: "voice",
    badge: "Section 2 • 3-Second Capture",
    title: "Hands-Free Voice Log",
    whatItDoes:
      "Lets you speak or type naturally during an attack — AI extracts pain level, side, symptoms, triggers, and meds automatically.",
    howToUse: [
      "Keep your eyes closed in a dark room and tap 'Tap & speak'.",
      "Say what you feel naturally, or type a quick line and tap 'Log'.",
    ],
    example:
      "Say \"Pain 7, left eye, took sumatriptan\" — NeuroCalm logs the spike, side, and subtracts 1 from your monthly triptan count.",
    icon: Mic,
  },
  {
    id: "baseline",
    screen: "baseline",
    badge: "Section 3 • Chronic + Med Safety",
    title: "Daily Baseline & Monthly Med Limits",
    whatItDoes:
      "Built for both episodic and chronic migraine. Tracks your daily baseline plus your monthly Triptan (10/mo) and NSAID (15/mo) safety limits.",
    howToUse: [
      "Tap one of the 4 baselines (Pain-Free, Mild, Moderate, Bedbound) once a day.",
      "Tap '4/10–10/10' for sudden spikes, and tap any medication chip when you take a dose.",
    ],
    example:
      "If you hit 8/10 triptan days this month, a 'Near Limit' alert warns you before medication overuse headaches start.",
    icon: Pill,
  },
  {
    id: "triggers",
    screen: "triggers",
    badge: "Section 4 • 24h Lag Engine",
    title: "Good-Day vs Migraine-Day Trigger AI",
    whatItDoes:
      "Compares your pain-free days against attack days — including 24-hour lagged triggers — so you stop chasing false-positive foods.",
    howToUse: [
      "Tap your daily triggers on the Log tab (and log sleep/stress on the Triggers tab).",
      "Tap 'Gemini Summary' to get a concise breakdown of your strongest threshold combinations.",
    ],
    example:
      "Discover that caffeine alone doesn't trigger you, but Dehydration yesterday + a 5 hPa pressure drop today causes 78% of your attacks.",
    icon: Activity,
  },
  {
    id: "calendar",
    screen: "calendar",
    badge: "Section 5 • Prior-Auth Proof",
    title: "30-Day Heatmap & Did Your Meds Work?",
    whatItDoes:
      "Visualizes your last 30 days in a dim OLED heatmap and lets you mark every medication dose as 'Helped' or 'Failed'.",
    howToUse: [
      "Scan the 30-day grid to spot weekly clusters at a glance.",
      "Tap 'Helped' or 'Failed' next to each dose after 2 hours.",
    ],
    example:
      "Marking older triptans or NSAIDs as 'Failed' builds the exact step-therapy proof insurance companies demand for CGRP/Botox.",
    icon: Calendar,
  },
  {
    id: "report",
    screen: "report",
    badge: "Section 6 • Clinical Export",
    title: "1-Click Neurologist & Insurance PDF",
    whatItDoes:
      "Calculates official MIDAS & HIT-6 disability scores and exports a clean 1-page clinical PDF for your neurologist or insurance appeal.",
    howToUse: [
      "Complete the quick MIDAS or HIT-6 questions on the Doctor PDF tab.",
      "Tap 'Export 1-Page PDF' right before your appointment.",
    ],
    example:
      "Hand your doctor a single page showing 14 monthly migraine days, MIDAS Grade IV, and documented failed therapies.",
    icon: FileText,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-[#e7d8c9]">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-[#261e1a]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudLightning className="w-5 h-5 text-[#d97706]" />
            <span className="text-sm font-semibold tracking-wide text-[#d4a373]">
              NeuroCalm
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#14110f] border border-[#261e1a] text-[#78716c]">
              BLACKOUT PWA
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-5 text-xs text-[#a8a29e]">
            <a href="#flow" className="hover:text-[#d4a373]">
              How It Works
            </a>
            <a href="#walkthrough" className="hover:text-[#d4a373]">
              App Guide
            </a>
            <Link href="/log" className="hover:text-[#d4a373]">
              Open Web App
            </Link>
          </div>

          <InstallPwaButton
            label="Install"
            className="!px-3.5 !py-1.5 !text-xs !rounded-lg"
          />
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-12 pb-16 grid lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0a0a0a] border border-[#261e1a] text-[11px] text-[#d97706]">
            <span>Photophobia-Safe • Offline-First • Zero Ads</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#e7d8c9] leading-tight">
            Track Migraines Without Blinding Your Eyes.
          </h1>

          <p className="text-sm sm:text-base text-[#a8a29e] leading-relaxed">
            Built from real patient frustrations: no blinding white screens, no
            20-question forms during an attack, and no paywalls blocking your
            doctor report. Try the interactive phone preview right here, or
            install it to your home screen.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <InstallPwaButton label="Install App" />
            <Link
              href="/log"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium bg-[#0a0a0a] border border-[#261e1a] text-[#d4a373] hover:border-[#d97706] transition"
            >
              <span>Open Web App</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-[11px] text-[#78716c]">
            Tip: Tap buttons inside the phone frame to preview every tab live.
          </p>
        </div>

        <div>
          <MobileMockupFrame screen="hero" interactive />
        </div>
      </section>

      {/* Visual Working Flow */}
      <section
        id="flow"
        className="border-y border-[#261e1a] bg-[#060504] py-14 px-4"
      >
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#d4a373]">
              Visual Working Flow
            </h2>
            <p className="text-xs sm:text-sm text-[#78716c]">
              From a 3-second dark-room log to an insurance-ready clinical PDF.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                step: "Step 01",
                title: "Capture in 3 Seconds",
                desc: "Tap your baseline or speak hands-free. Saves instantly to your device even in Airplane Mode.",
              },
              {
                step: "Step 02",
                title: "Correlate & Protect",
                desc: "Matches pain-free vs attack days with 24h lag triggers, local barometric pressure, and triptan limits.",
              },
              {
                step: "Step 03",
                title: "Export Clinical PDF",
                desc: "Generate a 1-page neurologist & Prior-Authorization PDF with MIDAS, HIT-6, and failed therapies.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl bg-black border border-[#261e1a] p-5 space-y-2"
              >
                <span className="text-[11px] font-mono text-[#d97706]">
                  {item.step}
                </span>
                <h3 className="text-sm font-semibold text-[#e7d8c9]">
                  {item.title}
                </h3>
                <p className="text-xs text-[#a8a29e] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section-by-Section Interactive Walkthrough */}
      <section id="walkthrough" className="max-w-5xl mx-auto px-4 py-16 space-y-20">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-[#d4a373]">
            Complete App Walkthrough
          </h2>
          <p className="text-xs sm:text-sm text-[#78716c]">
            Every section explained with real-life examples inside mobile frames.
          </p>
        </div>

        {WALKTHROUGHS.map((sec, idx) => {
          const Icon = sec.icon;
          const reverse = idx % 2 === 1;
          return (
            <div
              key={sec.id}
              className="grid lg:grid-cols-2 gap-10 items-center"
            >
              <div className={`space-y-4 ${reverse ? "lg:order-2" : ""}`}>
                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-[#0a0a0a] border border-[#261e1a] text-[#d97706]">
                  <Icon className="w-3.5 h-3.5" />
                  {sec.badge}
                </span>

                <h3 className="text-xl sm:text-2xl font-bold text-[#e7d8c9]">
                  {sec.title}
                </h3>

                <p className="text-sm text-[#a8a29e] leading-relaxed">
                  {sec.whatItDoes}
                </p>

                <div className="rounded-xl bg-[#0a0a0a] border border-[#261e1a] p-4 space-y-2">
                  <div className="text-xs font-semibold text-[#d4a373]">
                    How to Use It
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#a8a29e]">
                    {sec.howToUse.map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <span className="text-[#d97706]">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-[#14110f] border border-[#d97706]/30 p-3.5 text-xs text-[#e7d8c9]">
                  <span className="font-semibold text-[#d97706]">
                    Real-Life Example:{" "}
                  </span>
                  {sec.example}
                </div>
              </div>

              <div className={reverse ? "lg:order-1" : ""}>
                <MobileMockupFrame screen={sec.screen} interactive />
              </div>
            </div>
          );
        })}
      </section>

      {/* Bottom Install & Privacy CTA */}
      <section className="border-t border-[#261e1a] bg-[#060504] py-14 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="flex justify-center gap-4 text-xs text-[#78716c]">
            <span className="flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 text-[#d97706]" /> 100%
              Offline-First
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#d97706]" /> Private Cloud
              Sync
            </span>
          </div>

          <h2 className="text-2xl font-bold text-[#e7d8c9]">
            Ready for Your Next Migraine-Free Day
          </h2>
          <p className="text-xs sm:text-sm text-[#a8a29e]">
            Install NeuroCalm directly to your phone or desktop in one tap — no
            app store required.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <InstallPwaButton label="Install NeuroCalm" />
            <Link
              href="/log"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium bg-black border border-[#261e1a] text-[#d4a373] hover:border-[#d97706] transition"
            >
              <span>Launch App Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
