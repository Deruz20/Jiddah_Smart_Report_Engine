import React from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import AnalyticsContent, { AnalyticsData } from "@/components/layout/analytics-content";

export const dynamic = "force-dynamic";

export default async function AnalyticsDashboard() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // For now, we will fetch the classes to populate the class performance list,
  // and use mock data for the rest since full historical grade tracking 
  // requires a fully populated database over multiple terms.
  const { data: classes } = await supabase.from('circular_classes').select('id, class_name, section');

  const classPerformance = classes?.map((c) => ({
    class: c.class_name,
    avg: Math.floor(Math.random() * 20) + 75,
  })) || [];

  const data: AnalyticsData = {
    termPerformance: [
      { term: "Term 1", average: 82, highest: 96, lowest: 65 },
      { term: "Term 2", average: 85, highest: 98, lowest: 68 },
      { term: "Term 3", average: 84, highest: 97, lowest: 66 }
    ],
    classPerformance,
    subjectPerformance: [
      { subject: "Mathematics", avg: 78 },
      { subject: "English", avg: 85 },
      { subject: "Science", avg: 82 },
      { subject: "SST", avg: 88 },
      { subject: "Quran", avg: 92 },
      { subject: "Arabic", avg: 90 },
      { subject: "Islamic", avg: 89 }
    ],
    attendanceTrend: [
      { month: "Sep", rate: 94 },
      { month: "Oct", rate: 96 },
      { month: "Nov", rate: 91 },
      { month: "Dec", rate: 88 },
      { month: "Jan", rate: 93 },
      { month: "Feb", rate: 95 },
      { month: "Mar", rate: 97 },
      { month: "Apr", rate: 92 },
    ],
    gradeDistribution: [
      { grade: "Distinction (D1-D2)", count: 145, fill: "#10B981" },
      { grade: "Credit (C3-C6)", count: 210, fill: "#F59E0B" },
      { grade: "Pass (P7-P8)", count: 45, fill: "#3B82F6" },
      { grade: "Failure (F9)", count: 12, fill: "#EF4444" },
    ]
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a] p-4 sm:p-6 lg:p-8">
      <AnalyticsContent data={data} />
    </div>
  );
}
