import React from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DashboardContent, DashboardData } from "@/components/layout/dashboard-content";

export const dynamic = "force-dynamic";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [
    { count: studentCount },
    { count: teacherCount },
    { data: classes },
    { count: reportCount },
    { data: recentMarks }
  ] = await Promise.all([
    supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('circular_classes').select('id, class_name, section'),
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).ilike('action', '%report%'),
    supabase.from('circular_marks').select(`
      id,
      eot_score,
      created_at,
      enrollments (
        students ( name ),
        circular_classes ( class_name )
      ),
      circular_subjects ( subject_name )
    `).order('created_at', { ascending: false }).limit(5)
  ]);

  const recentActivity = recentMarks?.map((mark: any) => ({
    name: mark.enrollments?.students?.name || "Unknown Student",
    grade: mark.enrollments?.circular_classes?.class_name || "N/A",
    score: mark.eot_score || 0,
    subject: mark.circular_subjects?.subject_name || "N/A",
    time: mark.created_at ? timeAgo(mark.created_at) : "Recently"
  })) || [];

  const classPerformance = classes?.map((c) => ({
    name: c.class_name,
    students: Math.floor(Math.random() * 20) + 10, // Placeholder until full enrollment counts per class are added
    completion: Math.floor(Math.random() * 30) + 70, // Placeholder
    teacher: "Assigned Teacher"
  })) || [];

  const data: DashboardData = {
    kpis: {
      totalStudents: studentCount ?? 0,
      avgScore: 78, // Placeholder
      reports: reportCount ?? 0,
      topPerformers: teacherCount ?? 0,
    },
    recentActivity,
    classes: classPerformance,
    chartData: {
      overview: [
        { name: "Week 1", score: 65, avg: 60 },
        { name: "Week 2", score: 72, avg: 62 },
        { name: "Week 3", score: 78, avg: 65 },
        { name: "Week 4", score: 75, avg: 66 },
        { name: "Week 5", score: 82, avg: 68 },
        { name: "Week 6", score: 85, avg: 70 },
        { name: "Week 7", score: 80, avg: 71 },
        { name: "Week 8", score: 88, avg: 73 },
      ],
      gender: [
        { subject: "Math", Boys: 76, Girls: 82 },
        { subject: "Science", Boys: 80, Girls: 79 },
        { subject: "English", Boys: 72, Girls: 85 },
        { subject: "Arabic", Boys: 88, Girls: 91 },
        { subject: "Theology", Boys: 85, Girls: 88 },
      ],
      performance: [
        { subject: "Participation", circular: 80, theology: 85, fullMark: 100 },
        { subject: "Assignments", circular: 85, theology: 90, fullMark: 100 },
        { subject: "Tests", circular: 75, theology: 88, fullMark: 100 },
        { subject: "Attendance", circular: 95, theology: 96, fullMark: 100 },
        { subject: "Behavior", circular: 82, theology: 94, fullMark: 100 },
      ]
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <DashboardContent data={data} />
    </div>
  );
}
