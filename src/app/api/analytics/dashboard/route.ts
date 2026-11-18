import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/api-cors";
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

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request) ?? new NextResponse(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request);
  if (preflight) return preflight;

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return withCors(
        request,
        NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
      );
    }

    const access = await verifyDataAccess(supabase, user, "read");
    if (!access.isAuthorized) {
      return withCors(
        request,
        NextResponse.json({ error: access.message || "Forbidden", code: "FORBIDDEN" }, { status: 403 })
      );
    }

    const scope = resolveUserScope(access);
    const allowedCirc = classIdsForType(access, "circular");
    const allowedTheo = classIdsForType(access, "theology");
    const isUuid = (id: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let enrollQuery = supabase
      .from("enrollments")
      .select("id, circular_class_id, theology_class_id, students!inner(id, is_archived)", { count: "exact" })
      .eq("is_active", true)
      .eq("students.is_archived", false);
    let classQuery = supabase.from("circular_classes").select("id, class_name, section");
    let theoClassQuery = supabase
      .from("theology_classes")
      .select("id, class_name_english, class_name_arabic, level");

    if (allowedCirc !== null || allowedTheo !== null) {
      const validCirc = (allowedCirc || []).filter(isUuid);
      const validTheo = (allowedTheo || []).filter(isUuid);
      const orParts = [
        ...(validCirc.length ? [`circular_class_id.in.(${validCirc.join(",")})`] : []),
        ...(validTheo.length ? [`theology_class_id.in.(${validTheo.join(",")})`] : []),
      ];
      if (orParts.length > 0) {
        enrollQuery = enrollQuery.or(orParts.join(","));
      } else {
        enrollQuery = enrollQuery.eq("circular_class_id", "00000000-0000-0000-0000-000000000000");
      }

      if (validCirc.length > 0) {
        classQuery = classQuery.in("id", validCirc);
      } else if (allowedCirc !== null) {
        classQuery = classQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }

      if (validTheo.length > 0) {
        theoClassQuery = theoClassQuery.in("id", validTheo);
      } else if (allowedTheo !== null) {
        theoClassQuery = theoClassQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    const [
      { data: enrollments, count: studentCount },
      { data: activeTeachers },
      { data: classes },
      { data: theoClasses },
      { data: terms },
      { count: reportCount },
      { data: attendanceRows },
      { data: circularSubjects },
      { data: theologySubjects },
      { data: recentActivityLogs },
      { data: recentNotifications },
      mergedSettings,
    ] = await Promise.all([
      enrollQuery,
      supabase
        .from("teachers")
        .select("id, auth_user_id, name, email, role, subject, status")
        .eq("status", "active"),
      scope.canAccessSecular ? classQuery : Promise.resolve({ data: [] }),
      scope.canAccessTheology ? theoClassQuery : Promise.resolve({ data: [] }),
      supabase.from("terms").select("*").order("academic_year", { ascending: false }),
      supabase
        .from("activity_logs")
        .select("*", { count: "exact", head: true })
        .ilike("action", "%report%"),
      supabase.from("attendance").select("status, date").limit(500),
      scope.canAccessSecular
        ? supabase.from("circular_subjects").select("id, section")
        : Promise.resolve({ data: [] }),
      scope.canAccessTheology
        ? supabase.from("theology_subjects").select("id, level")
        : Promise.resolve({ data: [] }),
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
      fetchMergedSchoolSettings(supabase),
    ]);

    const { activeTerm, matchingTermIds } = resolveActiveTermAndMatchingIds(terms || []);
    const matchingTermIdArray = Array.from(matchingTermIds);
    const enrollRows = enrollments ?? [];

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

    const circularMarks = filterMarksByMatchingTerms(rawCircularMarks || [], matchingTermIds);
    const theologyMarks = filterMarksByMatchingTerms(rawTheologyMarks || [], matchingTermIds);

    const {
      secularClassStatuses,
      theologyClassStatuses,
      classStatuses,
      totalRequiredEotSecular,
      totalRequiredEotTheology,
      excludedEotEnrollmentIds,
    } = buildClassStatuses({
      department: scope.department,
      enrollments: enrollRows,
      circularClasses: classes || [],
      theologyClasses: theoClasses || [],
      circularMarks,
      theologyMarks,
      circularSubjects: circularSubjects || [],
      theologySubjects: theologySubjects || [],
      termNumber: activeTerm?.term_number ?? null,
      termLabel: activeTerm?.label ?? activeTerm?.name ?? null,
      candidateRules: mergedSettings?.candidate_class_rules,
    });

    const totalRequiredSecular = secularClassStatuses.reduce((s, c) => s + c.totalRequired, 0);
    const totalRequiredTheology = theologyClassStatuses.reduce((s, c) => s + c.totalRequired, 0);

    const examBreakdown = computeExamBreakdown({
      department: scope.department,
      circularMarks,
      theologyMarks,
      totalRequiredSecular,
      totalRequiredTheology,
      totalRequiredEotSecular,
      totalRequiredEotTheology,
      excludedEotEnrollmentIds,
    });

    const missingMarks = classStatuses.reduce((sum, c) => sum + c.missingMarks, 0);
    const totalAnomalies =
      (scope.canAccessSecular ? circularMarks.filter(hasScoreAnomaly).length : 0) +
      (scope.canAccessTheology ? theologyMarks.filter(hasScoreAnomaly).length : 0);

    const attList = attendanceRows ?? [];
    const presentCount = attList.filter((a: any) => a.status === "present" || a.status === "late").length;
    const avgAttendance = attList.length > 0 ? Math.round((presentCount / attList.length) * 100) : 0;

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

    const teachersList = activeTeachers || [];
    const payload = {
      scope: {
        role: scope.canonicalRole,
        department: scope.department,
        isUnassigned: scope.isUnassigned,
      },
      kpis: {
        totalStudents: studentCount ?? enrollRows.length,
        activeClasses: classStatuses.length,
        reportsGenerated: reportCount ?? 0,
        avgAttendance,
        activeTeachers: teachersList.length,
        teachers: teachersList.length,
        missingMarks,
        pendingMarks: missingMarks,
        totalAnomalies,
        readyToPrintCount: classStatuses.filter((c) => c.percent === 100).length,
      },
      examBreakdown,
      classStatuses,
      recentActivity: resolveActivityRows(recentActivityLogs, teachersList),
      notifications: alerts,
      classPerformance: classStatuses.map((c) => ({
        class: c.className,
        students: c.totalStudents,
        avg: c.percent,
      })),
      currentTerm: activeTerm,
    };

    return withCors(request, NextResponse.json(payload));
  } catch (err: any) {
    return withCors(
      request,
      NextResponse.json(
        { error: err?.message || "Failed to load analytics", code: "ANALYTICS_ERROR" },
        { status: 500 }
      )
    );
  }
}
