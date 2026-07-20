import React from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import DashboardContent, { DashboardData } from "@/components/layout/dashboard-content";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  const rawRole = user?.user_metadata?.role || '';
  
  const isDOS = typeof rawRole === 'string' && rawRole.toUpperCase().includes('DOS');
  const isTeacher = typeof rawRole === 'string' && (rawRole.includes('Class Teacher') || rawRole.includes('Theology Instructor') || rawRole.toLowerCase() === 'teacher');
  const isAdmin = !isDOS && !isTeacher;
  
  const role: 'admin' | 'dos' | 'teacher' = isAdmin ? 'admin' : isDOS ? 'dos' : 'teacher';

  let studentQuery = supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true);
  let teacherQuery = supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('status', 'active');
  let classQuery = supabase.from('circular_classes').select('id, class_name, section');
  let reportQuery = supabase.from('activity_logs').select('*', { count: 'exact', head: true }).ilike('action', '%report%');

  if (isTeacher && user?.email) {
    const { data: teacherProfile } = await supabase.from('teachers').select('classes').eq('email', user.email).single();
    const assignedClasses = teacherProfile?.classes || [];
    if (assignedClasses.length > 0) {
      studentQuery = studentQuery.in('circular_class', assignedClasses);
      classQuery = classQuery.in('class_name', assignedClasses);
    } else {
      // Dummy query that returns 0 if no classes are assigned
      studentQuery = studentQuery.eq('circular_class', 'UNASSIGNED_DUMMY_VALUE');
      classQuery = classQuery.eq('class_name', 'UNASSIGNED_DUMMY_VALUE');
    }
  } else if (isDOS) {
    const isTheology = rawRole.toUpperCase().includes('THEOLOGY');
    if (isTheology) {
      teacherQuery = teacherQuery.ilike('role', '%Theology%');
    } else {
      teacherQuery = teacherQuery.not('role', 'ilike', '%Theology%');
    }
  }

  const [
    { count: studentCount },
    { count: teacherCount },
    { data: classes },
    { count: reportCount },
    { data: recentActivityLogs },
    { data: recentNotifications }
  ] = await Promise.all([
    studentQuery,
    teacherQuery,
    classQuery,
    reportQuery,
    supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5)
  ]);

  // Mock attendance trend matching the old Dashboard UI
  const attendanceTrend = [
    { month: "Sep", rate: 94 },
    { month: "Oct", rate: 96 },
    { month: "Nov", rate: 91 },
    { month: "Dec", rate: 88 },
    { month: "Jan", rate: 93 },
    { month: "Feb", rate: 95 },
    { month: "Mar", rate: 97 },
    { month: "Apr", rate: 92 },
  ];

  const classPerformance = classes?.map((c) => ({
    class: c.class_name,
    avg: Math.floor(Math.random() * 20) + 75, // Placeholder until full marks query is implemented
  })) || [];

  const data: DashboardData = {
    role,
    kpis: {
      totalStudents: studentCount ?? 0,
      activeTeachers: teacherCount ?? 0,
      reportsGenerated: reportCount ?? 0,
      avgAttendance: 93, // Based on trend average
    },
    attendanceTrend,
    classPerformance,
    recentActivity: recentActivityLogs?.map(log => ({
      id: log.id,
      entity_type: log.entity_type || 'system',
      user_name: log.user_name || 'System',
      action: log.action,
      created_at: log.created_at
    })) || [],
    notifications: recentNotifications?.map(notif => ({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      time: new Date(notif.created_at).toLocaleDateString(), // simplified
      read: notif.read
    })) || []
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <DashboardContent data={data} />
    </div>
  );
}
