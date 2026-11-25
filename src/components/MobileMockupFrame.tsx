"use client";

import React, { useState } from "react";
import {
  Activity,
  Calendar,
  Check,
  CheckCircle2,
  CloudLightning,
  CloudRain,
  Download,
  FileText,
  MapPin,
  Mic,
  Pill,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";

export type MockupScreenId =
  | "hero"
  | "pressure"
  | "voice"
  | "baseline"
  | "triggers"
  | "calendar"
  | "report";

export function MobileMockupFrame({
  screen,
  interactive = true,
}: {
  screen: MockupScreenId;
  interactive?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<MockupScreenId>(screen);
  const [selectedBase, setSelectedBase] = useState<string>("Bedbound");
  const [voiceDemoParsed, setVoiceDemoParsed] = useState(false);
  const [medStatus, setMedStatus] = useState<"helped" | "failed">("failed");
  const [triptanCount, setTriptanCount] = useState(8);

  const current = interactive ? activeTab : screen;

  return (
    <div className="mx-auto w-[300px] sm:w-[320px] rounded-[2.6rem] bg-[#080706] border-[3px] border-[#261e1a] p-2.5 shadow-2xl shadow-black/90 select-none">
      {/* Inner OLED Display */}
      <div className="rounded-[2.1rem] bg-black border border-[#1c1613] overflow-hidden flex flex-col min-h-[540px]">
        {/* Status Bar + Dynamic Island */}
        <div className="px-5 pt-2.5 pb-1.5 flex items-center justify-between text-[10px] text-[#78716c]">
          <span>9:41</span>
          <div className="w-20 h-4 rounded-full bg-[#0d0b0a] border border-[#261e1a]" />
          <span>100%</span>
        </div>

        {/* Mini App Header */}
        <div className="px-3.5 py-2 border-b border-[#1c1613] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CloudLightning className="w-3.5 h-3.5 text-[#d97706]" />
            <span className="text-[11px] font-semibold text-[#d4a373]">
              NeuroCalm
            </span>
            <span className="text-[8px] px-1 py-0.5 rounded bg-[#14110f] border border-[#261e1a] text-[#78716c]">
              BLACKOUT
            </span>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded bg-[#0a0a0a] border border-[#261e1a] text-[#d4a373]">
            Synced
          </span>
        </div>

        {/* Screen Content */}
        <div className="flex-1 p-3 space-y-2.5 overflow-hidden">
          {(current === "hero" || current === "pressure") && (
            <div className="rounded-xl p-2.5 bg-[#1a0505] border border-[#b91c1c]/60 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-[#d97706] shrink-0" />
                <div>
                  <div className="font-medium text-[#d4a373]">
                    Pressure Drop Ahead (-5.1 hPa)
                  </div>
                  <div className="text-[9px] text-[#f87171]/80">
                    Higher risk in 24h • Keep meds close
                  </div>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-black border border-[#261e1a] text-[8px] text-[#d4a373] flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 text-[#d97706]" /> GPS
              </span>
            </div>
          )}

          {(current === "hero" || current === "voice") && (
            <div className="rounded-xl bg-[#0a0a0a] border border-[#261e1a] p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#d4a373] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#d97706]" />
                  Hands-Free Voice Log
                </span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#14110f] border border-[#261e1a] text-[#d97706]">
                  Smart Parse
                </span>
              </div>
              <button
                type="button"
                onClick={() => setVoiceDemoParsed(!voiceDemoParsed)}
                className="w-full py-3.5 rounded-lg bg-black border border-[#261e1a] hover:border-[#d97706]/60 flex flex-col items-center gap-1 transition"
              >
                <Mic className="w-5 h-5 text-[#d97706]" />
                <span className="text-[10px] font-medium text-[#d4a373]">
                  {voiceDemoParsed ? "Parsed in 0.8s ✓" : "Tap & speak"}
                </span>
                <span className="text-[9px] text-[#78716c]">
                  &ldquo;Pain 7, left eye, took sumatriptan&rdquo;
                </span>
              </button>
              {voiceDemoParsed && (
                <div className="p-2 rounded-lg bg-[#14110f] border border-[#d97706]/40 text-[9px] text-[#e7d8c9] space-y-0.5">
                  <div>• Peak Pain: 7/10 • Side: Left, Eye</div>
                  <div>• Med: Sumatriptan (Triptan)</div>
                </div>
              )}
            </div>
          )}

          {(current === "hero" || current === "baseline") && (
            <div className="rounded-xl bg-[#0a0a0a] border border-[#261e1a] p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-[#d4a373]">
                  Today&apos;s Baseline
                </span>
                <span className="text-[#ef4444]/85 text-[9px]">1 spike</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { name: "Pain-Free", sub: "No headache", cls: "text-[#4ade80]/80 border-[#15803d]/50" },
                  { name: "Mild", sub: "Manageable", cls: "text-[#d4a373] border-[#78716c]/50" },
                  { name: "Moderate", sub: "Functioning", cls: "text-[#f59e0b]/90 border-[#d97706]/60" },
                  { name: "Bedbound", sub: "Dark room", cls: "text-[#ef4444]/90 border-[#b91c1c]/70" },
                ].map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => setSelectedBase(b.name)}
                    className={`p-2 rounded-lg border text-left transition ${
                      selectedBase === b.name
                        ? `${b.cls} bg-[#14110f]`
                        : "bg-black border-[#261e1a] text-[#78716c]"
                    }`}
                  >
                    <div className="text-[10px] font-semibold">{b.name}</div>
                    <div className="text-[8px] text-[#78716c]">{b.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === "pressure" && (
            <div className="rounded-xl bg-[#0a0a0a] border border-[#261e1a] p-2.5 space-y-1.5 text-[10px]">
              <div className="font-semibold text-[#d4a373]">
                Why Pressure Matters
              </div>
              <p className="text-[9px] text-[#a8a29e] leading-relaxed">
                Your GPS fetches local surface pressure automatically. When a
                &ge;5 hPa drop approaches, NeuroCalm alerts you 24h early so you
                can hydrate and carry rescue meds.
              </p>
            </div>
          )}

          {current === "voice" && (
            <div className="rounded-xl bg-[#0a0a0a] border border-[#261e1a] p-2.5 space-y-1.5 text-[10px]">
              <div className="font-semibold text-[#d4a373]">
                Zero-Friction Capture
              </div>
              <p className="text-[9px] text-[#a8a29e] leading-relaxed">
                Tap the mic mockup above to see how natural speech turns into
                structured clinical data with zero dropdowns.
              </p>
            </div>
          )}

          {(current === "hero" || current === "baseline") && (
            <div className="rounded-xl bg-[#0a0a0a] border border-[#261e1a] p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#d4a373] flex items-center gap-1">
                  <Pill className="w-3 h-3 text-[#d97706]" />
                  Monthly Med Limits
                </span>
                {triptanCount >= 8 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1a0505] border border-[#b91c1c] text-[#fca5a5] flex items-center gap-0.5">
                    <ShieldAlert className="w-2.5 h-2.5" /> Near Limit
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <button
                  type="button"
                  onClick={() => setTriptanCount((c) => (c >= 10 ? 4 : c + 1))}
                  className="p-1.5 rounded-lg bg-black border border-[#261e1a]"
                >
                  <div className="text-[11px] font-semibold text-[#d97706]">
                    {triptanCount}/10
                  </div>
                  <div className="text-[8px] text-[#78716c]">Triptan</div>
                </button>
                <div className="p-1.5 rounded-lg bg-black border border-[#261e1a]">
                  <div className="text-[11px] font-semibold text-[#4ade80]/80">
                    2
                  </div>
                  <div className="text-[8px] text-[#78716c]">CGRP</div>
                </div>
                <div className="p-1.5 rounded-lg bg-black border border-[#261e1a]">
                  <div className="text-[11px] font-semibold text-[#d4a373]">
                    3/15
                  </div>
                  <div className="text-[8px] text-[#78716c]">NSAID</div>
                </div>
              </div>
            </div>
          )}

          {current === "triggers" && (
            <div className="rounded-xl bg-[#0a0a0a] border border-[#261e1a] p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#d4a373] flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#d97706]" />
                  Your Trigger Patterns
                </span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#14110f] border border-[#d97706]/50 text-[#d97706]">
                  Gemini Summary
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#14110f] border border-[#d97706]/40 text-[9px] text-[#e7d8c9]">
                • Attacks spike 78% when Dehydration precedes a &ge;5 hPa pressure
                drop by 24h.
              </div>
              {[
                { label: "24h Lag: Dehydration", pct: 78 },
                { label: "Sleep < 6h + Pressure Drop", pct: 71 },
                { label: "Skipped Meal", pct: 54 },
              ].map((row) => (
                <div
                  key={row.label}
                  className="p-2 rounded-lg bg-black border border-[#261e1a] space-y-1"
                >
                  <div className="flex justify-between text-[9px]">
                    <span className="text-[#e7d8c9]">{row.label}</span>
                    <span className="text-[#d97706]">{row.pct}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-[#14110f] overflow-hidden">
                    <div
                      className="h-full bg-[#d97706]"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {current === "calendar" && (
            <div className="space-y-2.5">
              <div className="rounded-xl bg-[#0a0a0a] border border-[#261e1a] p-2.5 space-y-2">
                <div className="text-[11px] font-semibold text-[#d4a373]">
                  30-Day Migraine Heatmap
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {[
                    "g", "g", "b", "a", "g", "g", "r", "a", "g", "g",
                    "g", "b", "g", "a", "g", "r", "r", "b", "g", "g",
                    "a", "g", "g", "b", "g", "g", "a", "r", "b", "g",
                  ].map((c, idx) => {
                    const cls =
                      c === "g"
                        ? "bg-[#15803d]/50 border-[#15803d]/70"
                        : c === "b"
                        ? "bg-[#44403c]/60 border-[#78716c]/60"
                        : c === "a"
                        ? "bg-[#d97706]/50 border-[#d97706]/80"
                        : "bg-[#b91c1c]/65 border-[#ef4444]/80";
                    return (
                      <div
                        key={idx}
                        className={`aspect-square rounded border ${cls}`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl bg-[#0a0a0a] border border-[#261e1a] p-2.5 space-y-2">
                <div className="text-[10px] font-semibold text-[#d4a373]">
                  Did Your Meds Work?
                </div>
                <div className="p-2 rounded-lg bg-black border border-[#261e1a] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#e7d8c9]">
                      Sumatriptan 50mg
                    </div>
                    <div className="text-[8px] text-[#78716c]">Prior-Auth Log</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setMedStatus("helped")}
                      className={`px-1.5 py-1 rounded border text-[9px] flex items-center gap-0.5 ${
                        medStatus === "helped"
                          ? "border-[#15803d] text-[#4ade80] bg-[#051a0c]"
                          : "border-[#261e1a] text-[#78716c]"
                      }`}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" /> Helped
                    </button>
                    <button
                      type="button"
                      onClick={() => setMedStatus("failed")}
                      className={`px-1.5 py-1 rounded border text-[9px] flex items-center gap-0.5 ${
                        medStatus === "failed"
                          ? "border-[#b91c1c] text-[#f87171] bg-[#1a0505]"
                          : "border-[#261e1a] text-[#78716c]"
                      }`}
                    >
                      <XCircle className="w-2.5 h-2.5" /> Failed
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {current === "report" && (
            <div className="space-y-2.5">
              <div className="rounded-xl bg-[#0a0a0a] border border-[#261e1a] p-2.5 space-y-2">
                <div className="text-[11px] font-semibold text-[#d4a373] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#d97706]" />
                  Doctor &amp; Insurance Report
                </div>
                <div className="p-2.5 rounded-lg bg-black border border-[#261e1a] space-y-1 text-[9px] text-[#a8a29e]">
                  <div className="font-semibold text-[#e7d8c9]">
                    1-Page Clinical Summary
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="w-2.5 h-2.5 text-[#4ade80]" /> Monthly
                    Migraine Days: 14
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="w-2.5 h-2.5 text-[#4ade80]" /> MIDAS: 24
                    (Grade IV) • HIT-6: 64
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="w-2.5 h-2.5 text-[#4ade80]" /> Failed
                    Therapies: Sumatriptan, Ibuprofen
                  </div>
                </div>
                <div className="w-full py-2 rounded-lg bg-[#14110f] border border-[#d97706]/60 text-[10px] font-semibold text-[#d97706] flex items-center justify-center gap-1.5">
                  <Download className="w-3 h-3" /> Export 1-Page PDF
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Mini Bottom Nav */}
        <div className="border-t border-[#1c1613] bg-black px-2 py-2 grid grid-cols-4 text-[9px]">
          {[
            { id: "hero" as const, label: "Log", icon: Mic },
            { id: "calendar" as const, label: "Calendar", icon: Calendar },
            { id: "triggers" as const, label: "Triggers", icon: Activity },
            { id: "report" as const, label: "PDF", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive =
              current === tab.id ||
              (tab.id === "hero" &&
                (current === "pressure" ||
                  current === "voice" ||
                  current === "baseline"));
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => interactive && setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 ${
                  isActive ? "text-[#d97706]" : "text-[#78716c]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Home Indicator */}
        <div className="pb-2 pt-1 flex justify-center">
          <div className="w-24 h-1 rounded-full bg-[#261e1a]" />
        </div>
      </div>
    </div>
  );
}
