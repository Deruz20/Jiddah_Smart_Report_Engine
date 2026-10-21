import React from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import AnalyticsContent, { AnalyticsData } from "@/components/layout/analytics-content";

export const dynamic = "force-dynamic";

export default async function AnalyticsDashboard() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch real classes, subjects, and marks from Supabase
  const [
    { data: classes },
    { data: subjects },
    { data: rawMarks },
    { data: terms }
  ] = await Promise.all([
    supabase.from('circular_classes').select('id, class_name, section'),
    supabase.from('circular_subjects').select('id, subject_name'),
    supabase.from('circular_marks').select('mot_score, eot_score, circular_class_id, circular_subject_id'),
    supabase.from('academic_terms').select('id, term_name, is_active')
  ]);

  const marks = Array.isArray(rawMarks) ? rawMarks : [];

  // Compute real class performance
  const classScores: Record<string, { sum: number; count: number }> = {};
  classes?.forEach((c) => {
    classScores[c.id] = { sum: 0, count: 0 };
  });

  // Compute real subject performance
  const subjectScores: Record<string, { sum: number; count: number }> = {};
  subjects?.forEach((s) => {
    subjectScores[s.id] = { sum: 0, count: 0 };
  });

  // Grade buckets: D1-D2 (>=75), C3-C6 (50..74), P7-P8 (35..49), F9 (<35)
  let dCount = 0;
  let cCount = 0;
  let pCount = 0;
  let fCount = 0;

  let totalScore = 0;
  let totalScoreCount = 0;
  let maxScore = 0;
  let minScore = 100;

  marks.forEach((m: any) => {
    const score = typeof m.eot_score === 'number' ? m.eot_score : typeof m.mot_score === 'number' ? m.mot_score : null;
    if (score !== null && !isNaN(score)) {
      totalScore += score;
      totalScoreCount++;
      if (score > maxScore) maxScore = score;
      if (score < minScore) minScore = score;

      if (score >= 75) dCount++;
      else if (score >= 50) cCount++;
      else if (score >= 35) pCount++;
      else fCount++;

      if (m.circular_class_id && classScores[m.circular_class_id]) {
        classScores[m.circular_class_id].sum += score;
        classScores[m.circular_class_id].count++;
      }
      if (m.circular_subject_id && subjectScores[m.circular_subject_id]) {
        subjectScores[m.circular_subject_id].sum += score;
        subjectScores[m.circular_subject_id].count++;
      }
    }
  });

  const classPerformance = (classes || []).map((c) => {
    const stat = classScores[c.id];
    const avg = stat && stat.count > 0 ? Math.round(stat.sum / stat.count) : 0;
    return { class: c.class_name, avg };
  });

  const subjectPerformance = (subjects || []).map((s) => {
    const stat = subjectScores[s.id];
    const avg = stat && stat.count > 0 ? Math.round(stat.sum / stat.count) : 0;
    return { subject: s.subject_name, avg };
  });

  const overallAvg = totalScoreCount > 0 ? Math.round(totalScore / totalScoreCount) : 0;
  const safeMin = totalScoreCount > 0 ? minScore : 0;

  const data: AnalyticsData = {
    termPerformance: [
      {
        term: terms?.find((t) => t.is_active)?.term_name || "Active Term",
        average: overallAvg,
        highest: maxScore,
        lowest: safeMin,
      },
    ],
    classPerformance,
    subjectPerformance: subjectPerformance.length > 0 ? subjectPerformance : [
      { subject: "English", avg: 0 },
      { subject: "Mathematics", avg: 0 },
      { subject: "Science", avg: 0 },
      { subject: "SST", avg: 0 },
    ],
    attendanceTrend: [],
    gradeDistribution: [
      { grade: "Distinction (D1-D2)", count: dCount, fill: "#10B981" },
      { grade: "Credit (C3-C6)", count: cCount, fill: "#F59E0B" },
      { grade: "Pass (P7-P8)", count: pCount, fill: "#3B82F6" },
      { grade: "Failure (F9)", count: fCount, fill: "#EF4444" },
    ],
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a] p-4 sm:p-6 lg:p-8">
      <AnalyticsContent data={data} />
    </div>
  );
}
