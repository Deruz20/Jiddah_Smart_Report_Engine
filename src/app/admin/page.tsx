import React from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import DashboardContent, { DashboardData } from "@/components/layout/dashboard-content";
import { enforceContrastGuard } from "@/lib/contrast-guard";
import { verifyDataAccess, resolveUserScope } from "@/lib/auth-server";
import { classIdsForType } from "@/lib/teacher-access";
import { fetchMergedSchoolSettings } from "@/lib/school-settings-helper";
import {
  buildClassStatuses,
  buildDashboardAlerts,
  computeExamBreakdown,
  filterMarksByMatchingTerms,
  hasScoreAnomaly,
  resolveActiveTermAndMatchingIds,
  resolveActivityRows,
} from "@/lib/dashboard-telemetry";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authRes = user ? await verifyDataAccess(supabase, user, "read") : { isAuthorized: false };
  const rawRole = authRes.role || user?.user_metadata?.role || "Administrator";
  const rawSubject = authRes.subject || user?.user_metadata?.subject || "";

  const scope = resolveUserScope({
    ...authRes,
    role: rawRole,
    subject: rawSubject,
    isAuthorized: authRes.isAuthorized !== false,
  });

  const isDOS = scope.isDOS;
  const isTeacher = scope.isTeacher;
  const isAdmin = !isDOS && !isTeacher;
  const role: "admin" | "dos" | "teacher" = isAdmin ? "admin" : isDOS ? "dos" : "teacher";

  const allowedCircularClassIds = authRes.isAuthorized ? classIdsForType(authRes, "circular") : null;
  const allowedTheologyClassIds = authRes.isAuthorized ? classIdsForType(authRes, "theology") : null;

  let studentQuery = supabase
    .from("enrollments")
    .select("id, student_id, circular_class_id, theology_class_id")
    .eq("is_active", true);
  let teacherQuery = supabase
    .from("teachers")
    .select("id, auth_user_id, name, email, role, subject, status")
    .eq("status", "active");
  let classQuery = supabase
    .from("circular_classes")
    .select("id, class_name, section")
    .order("class_name");
  let theoClassQuery = supabase
    .from("theology_classes")
    .select("id, class_name_english, class_name_arabic, level")
    .order("class_name_english");
  const reportQuery = supabase
    .from("activity_logs")
    .select("*", { count: "exact", head: true })
    .ilike("action", "%report%");

  const isUuid = (c: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c);

  if (allowedCircularClassIds !== null || allowedTheologyClassIds !== null) {
    const validCirc = (allowedCircularClassIds || []).filter(isUuid);
    const validTheo = (allowedTheologyClassIds || []).filter(isUuid);
    const filters = [
      ...(validCirc.length > 0 ? [`circular_class_id.in.(${validCirc.join(",")})`] : []),
      ...(validTheo.length > 0 ? [`theology_class_id.in.(${validTheo.join(",")})`] : []),
    ];
    if (filters.length > 0) {
      studentQuery = studentQuery.or(filters.join(","));
    } else {
      studentQuery = studentQuery.eq("circular_class_id", "00000000-0000-0000-0000-000000000000");
    }

    if (validCirc.length > 0) {
      classQuery = classQuery.in("id", validCirc);
    } else if (allowedCircularClassIds !== null) {
      classQuery = classQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }

    if (validTheo.length > 0) {
      theoClassQuery = theoClassQuery.in("id", validTheo);
    } else if (allowedTheologyClassIds !== null) {
      theoClassQuery = theoClassQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  } else if (isDOS) {
    if (scope.department === "theology") {
      teacherQuery = teacherQuery.ilike("subject", "%Theology%");
    } else if (scope.department === "secular") {
      teacherQuery = teacherQuery.not("subject", "ilike", "%Theology%");
    }
  }

  const [
    { data: termsRows },
    { data: activeTeachersRows },
    { data: classRows },
    { data: theoClassRows },
    { count: reportCount },
    { data: recentActivityLogs },
    { data: recentNotifications },
    { data: rawEnrollments },
    { data: circularSubjects },
    { data: theologySubjects },
    mergedSettings,
    { data: attendanceRows },
  ] = await Promise.all([
    supabase.from("terms").select("*").order("academic_year", { ascending: false }),
    teacherQuery,
    scope.canAccessSecular ? classQuery : Promise.resolve({ data: [] }),
    scope.canAccessTheology ? theoClassQuery : Promise.resolve({ data: [] }),
    reportQuery,
    supabase
      .from("activity_logs")
      .select("id, user_id, action, metadata, created_at")
      .neq("action", "school_customization_config")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("notifications")
      .select("id, title, message, read, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    studentQuery,
    scope.canAccessSecular
      ? supabase.from("circular_subjects").select("id, section")
      : Promise.resolve({ data: [] }),
    scope.canAccessTheology
      ? supabase.from("theology_subjects").select("id, level")
      : Promise.resolve({ data: [] }),
    fetchMergedSchoolSettings(supabase),
    supabase.from("attendance").select("status").limit(500),
  ]);

  const { activeTerm, matchingTermIds } = resolveActiveTermAndMatchingIds(termsRows || []);
  const matchingTermIdArray = Array.from(matchingTermIds);

  let circMarksQuery = supabase
    .from("circular_marks")
    .select("id, enrollment_id, subject_id, term_id, bot_score, mot_score, eot_score");
  let theoMarksQuery = supabase
    .from("theology_marks")
    .select("id, enrollment_id, subject_id, term_id, mot_score, eot_score");

  if (matchingTermIdArray.length === 1) {
    circMarksQuery = circMarksQuery.eq("term_id", matchingTermIdArray[0]);
    theoMarksQuery = theoMarksQuery.eq("term_id", matchingTermIdArray[0]);
  } else if (matchingTermIdArray.length > 1) {
    circMarksQuery = circMarksQuery.in("term_id", matchingTermIdArray);
    theoMarksQuery = theoMarksQuery.in("term_id", matchingTermIdArray);
  }

  const [{ data: rawCircularMarks }, { data: rawTheologyMarks }] = await Promise.all([
    scope.canAccessSecular ? circMarksQuery : Promise.resolve({ data: [] }),
    scope.canAccessTheology ? theoMarksQuery : Promise.resolve({ data: [] }),
  ]);

  const circularMarksList = filterMarksByMatchingTerms(rawCircularMarks || [], matchingTermIds);
  const theologyMarksList = filterMarksByMatchingTerms(rawTheologyMarks || [], matchingTermIds);
  const enrollmentsList = rawEnrollments || [];
  const classesList = classRows || [];
  const theoClassesList = theoClassRows || [];

  const { secularClassStatuses, theologyClassStatuses, classStatuses } = buildClassStatuses({
    department: scope.department,
    enrollments: enrollmentsList,
    circularClasses: classesList,
    theologyClasses: theoClassesList,
    circularMarks: circularMarksList,
    theologyMarks: theologyMarksList,
    circularSubjects: circularSubjects || [],
    theologySubjects: theologySubjects || [],
  });

  const totalRequiredSecular = secularClassStatuses.reduce((sum, c) => sum + c.totalRequired, 0);
  const totalRequiredTheology = theologyClassStatuses.reduce((sum, c) => sum + c.totalRequired, 0);

  const examBreakdown = computeExamBreakdown({
    department: scope.department,
    circularMarks: circularMarksList,
    theologyMarks: theologyMarksList,
    totalRequiredSecular,
    totalRequiredTheology,
  });

  const totalMissingMarks = classStatuses.reduce((acc, curr) => acc + curr.missingMarks, 0);
  const totalAnomalies =
    (scope.canAccessSecular ? circularMarksList.filter(hasScoreAnomaly).length : 0) +
    (scope.canAccessTheology ? theologyMarksList.filter(hasScoreAnomaly).length : 0);

  const rawThemeColor = mergedSettings?.theme_color || "#0F4D25";
  const contrastResult = enforceContrastGuard(rawThemeColor, "#FDFBF7", 4.5);

  const upcomingEvents = activeTerm
    ? [
        {
          title: `${activeTerm.label || activeTerm.name || "Academic Term"} Milestone`,
          date: activeTerm.end_date || "Term Ongoing",
          type: "term",
        },
        {
          title: "Marks Verification Cutoff",
          date: activeTerm.end_date ? `End: ${activeTerm.end_date}` : "Cycle Active",
          type: "deadline",
        },
      ]
    : [];

  const classPerformance = classStatuses.map((c) => ({
    class: c.className,
    avg: c.percent,
  }));

  const attendanceList = attendanceRows || [];
  const totalAttendance = attendanceList.length;
  const presentCount = attendanceList.filter(
    (a: any) => a.status === "present" || a.status === "late"
  ).length;
  const avgAttendance =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;
  const readyToPrintCount = classStatuses.filter((c) => c.percent === 100).length;

  const teachersList = activeTeachersRows || [];
  const staffMembers = teachersList.slice(0, 8).map((t: any) => {
    const name = t.name || "Staff Member";
    const tRole = t.role || "Teacher";
    const initials =
      name
        .split(" ")
        .map((w: string) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "ST";
    return {
      id: String(t.id),
      name,
      role: t.subject ? `${tRole} (${t.subject})` : tRole,
      department: t.subject?.toLowerCase().includes("theology")
        ? "Islamic Studies"
        : "Secular Curriculum",
      initials,
      status: t.status || "active",
    };
  });

  const storedNotifications = (recentNotifications || []).map((notif: any) => ({
    id: String(notif.id),
    title: notif.title || "System Notification",
    message: notif.message || "",
    time: new Date(notif.created_at).toLocaleDateString(),
    read: Boolean(notif.read),
  }));

  const alerts = buildDashboardAlerts({
    storedNotifications,
    classStatuses,
    examLocks: {
      bot: mergedSettings?.marks_locks?.bot_locked,
      mot: mergedSettings?.marks_locks?.mot_locked,
      eot: mergedSettings?.marks_locks?.eot_locked,
    },
  });

  const data: DashboardData = {
    role,
    department: scope.department,
    isUnassigned: scope.isUnassigned,
    canAccessReports: scope.canAccessReports,
    canAccessStudents: scope.canAccessStudents,
    canManageTeachers: scope.canManageTeachers,
    canViewAuditLogs: scope.canViewAuditLogs,
    kpis: {
      totalStudents: enrollmentsList.length,
      activeTeachers: teachersList.length,
      reportsGenerated: reportCount ?? 0,
      avgAttendance,
      missingMarks: totalMissingMarks,
      totalAnomalies,
      readyToPrintCount,
    },
    examBreakdown,
    classStatuses,
    attendanceTrend: [],
    classPerformance,
    staffMembers,
    recentActivity: resolveActivityRows(recentActivityLogs, teachersList),
    notifications: alerts,
    upcomingEvents,
    themeSettings: {
      schoolName: mergedSettings?.school_name || "Jiddah Islamic Schools",
      rawThemeColor,
      safeThemeColor: contrastResult.safeColor,
      contrastRatio: contrastResult.actualRatio,
      wasAdjusted: contrastResult.wasAdjusted,
      currentTerm: activeTerm?.label || activeTerm?.name || mergedSettings?.current_term || "Term 1",
      currentYear: activeTerm?.academic_year || mergedSettings?.current_year || new Date().getFullYear(),
    },
  };

  return (
    <div className="w-full min-h-full bg-[var(--bg-canvas,#F8FAFC)] text-[var(--text-primary,#0F172A)] transition-colors">
      <DashboardContent data={data} />
    </div>
  );
}
