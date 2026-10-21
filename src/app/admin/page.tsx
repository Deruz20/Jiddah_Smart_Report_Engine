import React from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import DashboardContent, { DashboardData, ClassReportingStatus } from "@/components/layout/dashboard-content";
import { enforceContrastGuard } from "@/lib/contrast-guard";
import { verifyDataAccess } from "@/lib/auth-server";
import { classIdsForType } from "@/lib/teacher-access";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  const authRes = user ? await verifyDataAccess(supabase, user, 'read') : { isAuthorized: false };
  const rawRole = authRes.role || user?.user_metadata?.role || '';

  const isDOS = typeof rawRole === 'string' && rawRole.toUpperCase().includes('DOS');
  const isTeacher = typeof rawRole === 'string' && (rawRole.includes('Class Teacher') || rawRole.includes('Theology Instructor') || rawRole.toLowerCase() === 'teacher');
  const isAdmin = !isDOS && !isTeacher;

  const role: 'admin' | 'dos' | 'teacher' = isAdmin ? 'admin' : isDOS ? 'dos' : 'teacher';

  const allowedCircularClassIds = authRes.isAuthorized ? classIdsForType(authRes, 'circular') : null;

  let studentQuery = supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true);
  let teacherQuery = supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('status', 'active');
  let classQuery = supabase.from('circular_classes').select('id, class_name, section').order('class_name');
  let reportQuery = supabase.from('activity_logs').select('*', { count: 'exact', head: true }).ilike('action', '%report%');

  if (allowedCircularClassIds !== null) {
    const validUuids = allowedCircularClassIds.filter((c) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c));
    if (validUuids.length > 0) {
      studentQuery = studentQuery.in('circular_class_id', validUuids);
      classQuery = classQuery.in('id', validUuids);
    } else {
      studentQuery = studentQuery.eq('circular_class_id', '00000000-0000-0000-0000-000000000000');
      classQuery = classQuery.eq('id', '00000000-0000-0000-0000-000000000000');
    }
  } else if (isDOS) {
    const isTheology = rawRole.toUpperCase().includes('THEOLOGY');
    if (isTheology) {
      teacherQuery = teacherQuery.ilike('subject', '%Theology%');
    } else {
      teacherQuery = teacherQuery.not('subject', 'ilike', '%Theology%');
    }
  }

  const [
    { count: studentCount },
    { count: teacherCount },
    { data: classRows },
    { count: reportCount },
    { data: recentActivityLogs },
    { data: recentNotifications },
    { data: rawCircularMarks },
    { data: rawTheologyMarks },
    { data: rawEnrollments },
    { data: schoolSettings },
    { data: activeTerm },
    { data: customConfigLogs }
  ] = await Promise.all([
    studentQuery,
    teacherQuery,
    classQuery,
    reportQuery,
    supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('circular_marks').select('id, enrollment_id, mark, mot_score, eot_score'),
    supabase.from('theology_marks').select('id, enrollment_id, mark, mot_score, eot_score'),
    supabase.from('enrollments').select('id, student_id, circular_class_id, theology_class_id').eq('is_active', true),
    supabase.from('school_settings').select('*').limit(1).maybeSingle(),
    supabase.from('terms').select('*').eq('is_current', true).maybeSingle(),
    supabase.from('activity_logs').select('details').eq('action', 'school_customization_config').order('created_at', { ascending: false }).limit(1)
  ]);

  const customConfig = (customConfigLogs && customConfigLogs[0]?.details) || {};

  // Compute live per-class reporting status
  const circularMarksList = rawCircularMarks || [];
  const theologyMarksList = rawTheologyMarks || [];
  const enrollmentsList = rawEnrollments || [];
  const classesList = classRows || [];

  const classStatuses: ClassReportingStatus[] = classesList.map((c: any) => {
    const rawLabel = c.class_name || 'Unnamed Class';
    const className = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(rawLabel) ? `Class (${c.section || 'General'})` : rawLabel;
    const classEnrollments = enrollmentsList.filter((e: any) => e.circular_class_id === c.id);
    const totalStudents = classEnrollments.length;
    const enrollmentIds = new Set(classEnrollments.map((e: any) => e.id));

    const classMarks = circularMarksList.filter((m: any) => enrollmentIds.has(m.enrollment_id));
    const marksEntered = classMarks.length;
    const totalRequired = totalStudents * 4; // 4 Core Secular Subjects (ENG, MTC, SCI, SST)
    const missingMarks = Math.max(0, totalRequired - marksEntered);

    const anomalies = classMarks.filter((m: any) => {
      const markVal = m.mark != null ? Number(m.mark) : null;
      const motVal = m.mot_score != null ? Number(m.mot_score) : null;
      const eotVal = m.eot_score != null ? Number(m.eot_score) : null;
      return (
        (markVal !== null && (markVal > 100 || markVal < 0)) ||
        (motVal !== null && (motVal > 100 || motVal < 0)) ||
        (eotVal !== null && (eotVal > 100 || eotVal < 0))
      );
    }).length;

    const percent = totalRequired > 0 ? Math.min(100, Math.round((marksEntered / totalRequired) * 100)) : 0;
    const stageLabel = totalStudents === 0
      ? 'No Students'
      : percent === 100
      ? 'Marks Submitted'
      : percent > 0
      ? 'Marks In Progress'
      : 'Pending Entry';

    return {
      className,
      totalStudents,
      marksEntered,
      totalRequired,
      missingMarks,
      stage: 'marks_in',
      stageLabel,
      percent,
      anomalies,
    };
  });

  const totalMissingMarks = classStatuses.reduce((acc, curr) => acc + curr.missingMarks, 0);

  const circularAnomalies = circularMarksList.filter((m: any) => {
    const markVal = m.mark != null ? Number(m.mark) : null;
    const motVal = m.mot_score != null ? Number(m.mot_score) : null;
    const eotVal = m.eot_score != null ? Number(m.eot_score) : null;
    return (
      (markVal !== null && (markVal > 100 || markVal < 0)) ||
      (motVal !== null && (motVal > 100 || motVal < 0)) ||
      (eotVal !== null && (eotVal > 100 || eotVal < 0))
    );
  }).length;

  const theologyAnomalies = theologyMarksList.filter((m: any) => {
    const markVal = m.mark != null ? Number(m.mark) : null;
    const motVal = m.mot_score != null ? Number(m.mot_score) : null;
    const eotVal = m.eot_score != null ? Number(m.eot_score) : null;
    return (
      (markVal !== null && (markVal > 100 || markVal < 0)) ||
      (motVal !== null && (motVal > 100 || motVal < 0)) ||
      (eotVal !== null && (eotVal > 100 || eotVal < 0))
    );
  }).length;

  const totalAnomalies = circularAnomalies + theologyAnomalies;

  const rawThemeColor = schoolSettings?.theme_color || customConfig?.theme_color || '#0F4D25';
  const contrastResult = enforceContrastGuard(rawThemeColor, '#FDFBF7', 4.5);

  const upcomingEvents = activeTerm ? [
    { title: `${activeTerm.label || 'Academic Term'} Milestone`, date: activeTerm.end_date || 'Term Ongoing', type: 'term' },
    { title: 'Marks Verification Cutoff', date: activeTerm.end_date ? `End: ${activeTerm.end_date}` : 'Cycle Active', type: 'deadline' },
  ] : [];

  const classPerformance = classStatuses.map((c) => ({
    class: c.className,
    avg: c.percent,
  }));

  const data: DashboardData = {
    role,
    kpis: {
      totalStudents: studentCount ?? enrollmentsList.length,
      activeTeachers: teacherCount ?? 0,
      reportsGenerated: reportCount ?? 0,
      avgAttendance: 0,
      missingMarks: totalMissingMarks,
      totalAnomalies,
      readyToPrintCount: 0,
    },
    classStatuses,
    attendanceTrend: [],
    classPerformance,
    recentActivity: recentActivityLogs?.map((log: any) => ({
      id: String(log.id),
      entity_type: log.action || 'system',
      user_name: 'Staff Member',
      action: log.action,
      created_at: log.created_at,
    })) || [],
    notifications: recentNotifications?.map((notif: any) => ({
      id: String(notif.id),
      title: notif.title,
      message: notif.message,
      time: new Date(notif.created_at).toLocaleDateString(),
      read: notif.read,
    })) || [],
    upcomingEvents,
    themeSettings: {
      schoolName: schoolSettings?.school_name || customConfig?.school_name || 'Jiddah Islamic Schools',
      rawThemeColor,
      safeThemeColor: contrastResult.safeColor,
      contrastRatio: contrastResult.actualRatio,
      wasAdjusted: contrastResult.wasAdjusted,
      currentTerm: activeTerm?.label || schoolSettings?.current_term || 'Term 1',
      currentYear: activeTerm?.academic_year || schoolSettings?.current_year || 2026,
    },
  };

  return (
    <div className="w-full h-full bg-[#FDFBF7]">
      <DashboardContent data={data} />
    </div>
  );
}
