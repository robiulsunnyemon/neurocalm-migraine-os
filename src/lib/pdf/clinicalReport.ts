import { jsPDF } from "jspdf";
import type {
  ClinicalAssessment,
  DailyLog,
  MedicationLog,
  MigraineAttack,
} from "@/types/migraine";
import {
  computeMohStatus,
  countMonthlyMigraineDays,
  getFailedTherapies,
} from "@/lib/clinical/assessments";
import { computeThresholdInsights } from "@/lib/analytics/correlations";

export function generateClinicalPdf(params: {
  dailyLogs: DailyLog[];
  attacks: MigraineAttack[];
  medications: MedicationLog[];
  assessments: ClinicalAssessment[];
}): void {
  const { dailyLogs, attacks, medications, assessments } = params;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyMigraineDays = countMonthlyMigraineDays(attacks);
  const painFreeDays = dailyLogs.filter((d) => d.baselineStatus === "pain_free").length;
  const moh = computeMohStatus(medications, monthPrefix);
  const failedMeds = getFailedTherapies(medications);
  const insights = computeThresholdInsights(dailyLogs, attacks);
  const latestMidas = assessments.find((a) => a.type === "MIDAS");
  const latestHit6 = assessments.find((a) => a.type === "HIT6");

  let y = 48;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("NeuroCalm — Clinical Migraine & Prior-Auth Summary", 40, y);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${now.toLocaleDateString()} | Total Logged Days: ${dailyLogs.length}`, 40, y);

  doc.setTextColor(0);
  y += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1. Monthly Burden & Disability Scores", 40, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`• Monthly Migraine Attack Days (current month): ${monthlyMigraineDays}`, 50, y);
  y += 15;
  doc.text(`• Recorded Pain-Free Baseline Days: ${painFreeDays}`, 50, y);
  y += 15;
  doc.text(
    `• MIDAS Score: ${latestMidas ? `${latestMidas.score} (${latestMidas.severityLabel})` : "Not completed yet"}`,
    50,
    y
  );
  y += 15;
  doc.text(
    `• HIT-6 Score: ${latestHit6 ? `${latestHit6.score} (${latestHit6.severityLabel})` : "Not completed yet"}`,
    50,
    y
  );

  y += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. Medication Usage & Prior Authorization History", 40, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `• Triptan Days (This Month): ${moh.triptanDaysThisMonth} ${moh.triptanWarning ? "[NEAR MOH LIMIT]" : ""}`,
    50,
    y
  );
  y += 15;
  doc.text(`• Gepant / CGRP Days (This Month): ${moh.gepantDaysThisMonth}`, 50, y);
  y += 15;
  doc.text(`• NSAID Days (This Month): ${moh.nsaidDaysThisMonth}`, 50, y);
  y += 15;
  doc.text(
    `• Documented Failed / Ineffective Therapies: ${failedMeds.length > 0 ? failedMeds.join(", ") : "None flagged"}`,
    50,
    y
  );

  y += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Threshold & Trigger Correlations", 40, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (insights.length === 0) {
    doc.text("• Insufficient multi-day data for statistical trigger correlation.", 50, y);
    y += 15;
  } else {
    for (const item of insights.slice(0, 4)) {
      doc.text(`• ${item.summary}`, 50, y);
      y += 15;
    }
  }

  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4. Recent Attacks (Latest 8)", 40, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const atk of attacks.slice(0, 8)) {
    const line = `${atk.dailyLogId} | Peak Pain: ${atk.peakPain}/10 | Locations: ${atk.locations.join(", ") || "-"} | Symptoms: ${atk.symptoms.join(", ") || "-"}`;
    doc.text(line, 50, y);
    y += 14;
    if (y > 760) break;
  }

  doc.save(`NeuroCalm-Clinical-Report-${now.toISOString().slice(0, 10)}.pdf`);
}
