import { resolveSectionType } from "./section-type";
import {
  doesExamApplyToClassInTerm,
  type CandidateClassExclusionRule,
} from "./academic-sections";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchAndReconcileSecularMarks,
  fetchAndReconcileTheologyMarks,
  type ReconciledMarkEntry,
} from "./marks-reconciliation";

export interface TermRecord {
  id: string;
  label?: string | null;
  name?: string | null;
  term_number?: number | null;
  academic_year?: number | string | null;
  end_date?: string | null;
  is_current?: boolean | null;
  is_active?: boolean | null;
}

export interface MarkRowRecord {
  id?: string;
  enrollment_id: string;
  subject_id?: string | null;
  term_id?: string | null;
  bot_score?: number | string | null;
  mot_score?: number | string | null;
  eot_score?: number | string | null;
}

export interface EnrollmentRecord {
  id: string;
  student_id?: string;
  circular_class_id?: string | null;
  theology_class_id?: string | null;
}

export interface CircularClassRecord {
  id: string;
  class_name?: string | null;
  section?: string | null;
}

export interface TheologyClassRecord {
  id: string;
  class_name_english?: string | null;
  class_name_arabic?: string | null;
  level?: string | null;
}

export interface SubjectRecord {
  id: string;
  section?: string | null;
  level?: string | null;
}

export interface ClassReportingStatus {
  className: string;
  track?: "secular" | "theology";
  totalStudents: number;
  marksEntered: number;
  totalRequired: number;
  missingMarks: number;
  stage: "marks_in" | "checked" | "remarks" | "approved" | "printed";
  stageLabel: string;
  percent: number;
  anomalies: number;
  eotApplicable?: boolean;
  candidateBadge?: string | null;
}

export interface ExamColumnMetric {
  entered: number;
  completionPct: number;
  averageScore: number | null;
}

export interface ExamBreakdownTelemetry {
  bot: ExamColumnMetric;
  mot: ExamColumnMetric;
  eot: ExamColumnMetric;
  progressionDelta: number | null;
}

function normalizeTermToken(value: string | number | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function resolveActiveTermAndMatchingIds(terms: TermRecord[] | null | undefined): {
  activeTerm: TermRecord | null;
  matchingTermIds: Set<string>;
} {
  const list = Array.isArray(terms) ? terms : [];
  if (list.length === 0) {
    return { activeTerm: null, matchingTermIds: new Set() };
  }

  const active =
    list.find((t) => Boolean(t.is_active) || Boolean(t.is_current)) ??
    [...list].sort((a, b) => {
      const yearDiff = Number(b.academic_year ?? 0) - Number(a.academic_year ?? 0);
      if (yearDiff !== 0) return yearDiff;
      return Number(b.term_number ?? 0) - Number(a.term_number ?? 0);
    })[0];

  const matchingTermIds = new Set<string>([active.id]);
  const activeName = normalizeTermToken(active.label || active.name);
  const activeYear = normalizeTermToken(active.academic_year);
  const activeNum = active.term_number != null ? Number(active.term_number) : null;

  for (const t of list) {
    const tName = normalizeTermToken(t.label || t.name);
    const tYear = normalizeTermToken(t.academic_year);
    const tNum = t.term_number != null ? Number(t.term_number) : null;
    const sameYear = !activeYear || !tYear || tYear === activeYear;
    const matchesByName = Boolean(activeName && tName === activeName && sameYear);
    const matchesByNum = Boolean(activeNum && tNum === activeNum && activeYear && tYear === activeYear);
    if (matchesByName || matchesByNum) {
      matchingTermIds.add(t.id);
    }
  }

  return { activeTerm: active, matchingTermIds };
}

function mapAndDedupeDashboardMarks(
  marks: ReconciledMarkEntry[],
  activeEnrollmentSet: Set<string>,
  studentToActiveEnrollment: Map<string, string>
): MarkRowRecord[] {
  const deduped = new Map<string, MarkRowRecord>();
  for (const m of marks) {
    const targetEnrollmentId =
      (m.enrollment_id && activeEnrollmentSet.has(m.enrollment_id) ? m.enrollment_id : null) ||
      (m.student_id ? studentToActiveEnrollment.get(m.student_id) || null : null);
    if (!targetEnrollmentId) continue;

    const subjectKey = m.subject_code || m.subject_id;
    const key = `${targetEnrollmentId}:${subjectKey}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, {
        id: m.id,
        enrollment_id: targetEnrollmentId,
        subject_id: m.subject_id,
        bot_score: m.bot_score,
        mot_score: m.mot_score,
        eot_score: m.eot_score,
      });
    } else {
      if (existing.bot_score == null && m.bot_score != null) existing.bot_score = m.bot_score;
      if (existing.mot_score == null && m.mot_score != null) existing.mot_score = m.mot_score;
      if (existing.eot_score == null && m.eot_score != null) existing.eot_score = m.eot_score;
    }
  }
  return Array.from(deduped.values());
}

export async function fetchScopedReconciledDashboardMarks(
  reader: SupabaseClient,
  params: {
    enrollments: EnrollmentRecord[];
    termIds: string[];
    canAccessSecular: boolean;
    canAccessTheology: boolean;
  }
): Promise<{
  circularMarks: MarkRowRecord[];
  theologyMarks: MarkRowRecord[];
}> {
  const { enrollments, termIds, canAccessSecular, canAccessTheology } = params;
  if (enrollments.length === 0 || termIds.length === 0) {
    return { circularMarks: [], theologyMarks: [] };
  }

  const enrollmentIds = enrollments.map((e) => e.id).filter(Boolean);
  const studentIds = [...new Set(enrollments.map((e) => e.student_id).filter((s): s is string => Boolean(s)))];
  const activeEnrollmentSet = new Set(enrollmentIds);
  const studentToActiveEnrollment = new Map<string, string>();
  for (const e of enrollments) {
    if (e.student_id && e.id && !studentToActiveEnrollment.has(e.student_id)) {
      studentToActiveEnrollment.set(e.student_id, e.id);
    }
  }

  const [reconciledCircular, reconciledTheology] = await Promise.all([
    canAccessSecular
      ? fetchAndReconcileSecularMarks(reader, { enrollmentIds, studentIds, termIds })
      : Promise.resolve([]),
    canAccessTheology
      ? fetchAndReconcileTheologyMarks(reader, { enrollmentIds, studentIds, termIds })
      : Promise.resolve([]),
  ]);

  return {
    circularMarks: mapAndDedupeDashboardMarks(reconciledCircular, activeEnrollmentSet, studentToActiveEnrollment),
    theologyMarks: mapAndDedupeDashboardMarks(reconciledTheology, activeEnrollmentSet, studentToActiveEnrollment),
  };
}

export function toNumericScore(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasAnyRecordedScore(mark: MarkRowRecord): boolean {
  return (
    toNumericScore(mark.bot_score) !== null ||
    toNumericScore(mark.mot_score) !== null ||
    toNumericScore(mark.eot_score) !== null
  );
}

export function hasScoreAnomaly(mark: MarkRowRecord): boolean {
  const vals = [
    toNumericScore(mark.bot_score),
    toNumericScore(mark.mot_score),
    toNumericScore(mark.eot_score),
  ];
  return vals.some((v) => v !== null && (v < 0 || v > 100));
}

export function filterMarksByMatchingTerms<T extends MarkRowRecord>(
  marks: T[] | null | undefined,
  matchingTermIds: Set<string>
): T[] {
  const list = Array.isArray(marks) ? marks : [];
  if (matchingTermIds.size === 0) {
    return list;
  }
  return list.filter((m) => !m.term_id || matchingTermIds.has(m.term_id));
}

function countSubjectsForCircularClass(
  cls: CircularClassRecord,
  circularSubjects: SubjectRecord[]
): number {
  if (!circularSubjects || circularSubjects.length === 0) return 4;
  const resolved = resolveSectionType(cls.section, cls.class_name);
  const candidate = normalizeTermToken(
    resolved === "unknown" || resolved === cls.class_name ? cls.section || resolved : resolved
  );
  const matching = circularSubjects.filter((s) => {
    const subjSection = normalizeTermToken(s.section);
    if (!candidate || !subjSection) return true;
    return (
      subjSection === candidate ||
      (candidate.includes("nursery") && subjSection.includes("nursery")) ||
      (candidate.includes("primary") && subjSection.includes("primary"))
    );
  });
  return matching.length > 0 ? matching.length : 4;
}

function countSubjectsForTheologyClass(
  tc: TheologyClassRecord,
  theologySubjects: SubjectRecord[]
): number {
  if (!theologySubjects || theologySubjects.length === 0) return 4;
  const level = normalizeTermToken(tc.level || tc.class_name_english);
  const matching = theologySubjects.filter((s) => {
    const subjLevel = normalizeTermToken(s.level);
    if (!level || !subjLevel) return true;
    return (
      subjLevel === level ||
      (level.includes("nursery") && subjLevel.includes("nursery")) ||
      (level.includes("primary") && subjLevel.includes("primary"))
    );
  });
  return matching.length > 0 ? matching.length : 4;
}

function deriveStageLabel(totalStudents: number, percent: number): string {
  if (totalStudents === 0) return "No Students";
  if (percent >= 100) return "Marks Submitted";
  if (percent > 0) return "Marks In Progress";
  return "Pending Entry";
}

export function buildClassStatuses(params: {
  department: "secular" | "theology" | "both";
  enrollments: EnrollmentRecord[];
  circularClasses: CircularClassRecord[];
  theologyClasses: TheologyClassRecord[];
  circularMarks: MarkRowRecord[];
  theologyMarks: MarkRowRecord[];
  circularSubjects?: SubjectRecord[];
  theologySubjects?: SubjectRecord[];
  termNumber?: number | null;
  termLabel?: string | null;
  candidateRules?: CandidateClassExclusionRule[];
}): {
  secularClassStatuses: ClassReportingStatus[];
  theologyClassStatuses: ClassReportingStatus[];
  classStatuses: ClassReportingStatus[];
  totalRequiredEotSecular: number;
  totalRequiredEotTheology: number;
  excludedEotEnrollmentIds: Set<string>;
} {
  const {
    department,
    enrollments,
    circularClasses,
    theologyClasses,
    circularMarks,
    theologyMarks,
    circularSubjects = [],
    theologySubjects = [],
    termNumber,
    termLabel,
    candidateRules,
  } = params;

  const excludedEotEnrollmentIds = new Set<string>();
  let totalRequiredEotSecular = 0;
  let totalRequiredEotTheology = 0;

  const secularClassStatuses: ClassReportingStatus[] = circularClasses.map((c) => {
    const rawLabel = c.class_name || "Unnamed Class";
    const className = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(rawLabel)
      ? `Class (${c.section || "General"})`
      : rawLabel;

    const eotApp = doesExamApplyToClassInTerm(
      {
        id: c.id,
        class_name: c.class_name,
        section: c.section,
        curriculum: "secular",
        examType: "eot",
        termNumber,
        termLabel,
      },
      candidateRules
    );

    const classEnrollments = enrollments.filter((e) => e.circular_class_id === c.id);
    const totalStudents = classEnrollments.length;
    const enrollmentIds = new Set(classEnrollments.map((e) => e.id));
    if (!eotApp.applies) {
      enrollmentIds.forEach((eid) => excludedEotEnrollmentIds.add(eid));
    }

    const classMarks = circularMarks.filter(
      (m) => enrollmentIds.has(m.enrollment_id) && hasAnyRecordedScore(m)
    );
    const marksEntered = classMarks.length;
    const subjectMultiplier = countSubjectsForCircularClass(c, circularSubjects);
    const rawRequired = totalStudents * subjectMultiplier;
    if (eotApp.applies) {
      totalRequiredEotSecular += rawRequired;
    }

    const suppressCandidateEotMissing = !eotApp.applies && marksEntered === 0;
    const totalRequired = suppressCandidateEotMissing ? 0 : rawRequired;
    const missingMarks = suppressCandidateEotMissing ? 0 : Math.max(0, totalRequired - marksEntered);
    const anomalies = classMarks.filter(hasScoreAnomaly).length;
    const percent =
      totalRequired > 0 ? Math.min(100, Math.round((marksEntered / totalRequired) * 100)) : 0;

    return {
      className,
      track: "secular",
      totalStudents,
      marksEntered,
      totalRequired,
      missingMarks,
      stage: "marks_in",
      stageLabel: suppressCandidateEotMissing ? eotApp.badge : deriveStageLabel(totalStudents, percent),
      percent,
      anomalies,
      eotApplicable: eotApp.applies,
      candidateBadge: !eotApp.applies ? eotApp.badge : null,
    };
  });

  const theologyClassStatuses: ClassReportingStatus[] = theologyClasses.map((tc) => {
    const baseName = tc.class_name_english || tc.class_name_arabic || "Theology Cohort";
    const className = department === "both" ? `${baseName} (Theology)` : baseName;
    const eotApp = doesExamApplyToClassInTerm(
      {
        id: tc.id,
        class_name_english: tc.class_name_english,
        class_name_arabic: tc.class_name_arabic,
        level: tc.level,
        curriculum: "theology",
        examType: "eot",
        termNumber,
        termLabel,
      },
      candidateRules
    );

    const classEnrollments = enrollments.filter((e) => e.theology_class_id === tc.id);
    const totalStudents = classEnrollments.length;
    const enrollmentIds = new Set(classEnrollments.map((e) => e.id));
    if (!eotApp.applies) {
      enrollmentIds.forEach((eid) => excludedEotEnrollmentIds.add(eid));
    }

    const classMarks = theologyMarks.filter(
      (m) => enrollmentIds.has(m.enrollment_id) && hasAnyRecordedScore(m)
    );
    const marksEntered = classMarks.length;
    const subjectMultiplier = countSubjectsForTheologyClass(tc, theologySubjects);
    const rawRequired = totalStudents * subjectMultiplier;
    if (eotApp.applies) {
      totalRequiredEotTheology += rawRequired;
    }

    const suppressCandidateEotMissing = !eotApp.applies && marksEntered === 0;
    const totalRequired = suppressCandidateEotMissing ? 0 : rawRequired;
    const missingMarks = suppressCandidateEotMissing ? 0 : Math.max(0, totalRequired - marksEntered);
    const anomalies = classMarks.filter(hasScoreAnomaly).length;
    const percent =
      totalRequired > 0 ? Math.min(100, Math.round((marksEntered / totalRequired) * 100)) : 0;

    return {
      className,
      track: "theology",
      totalStudents,
      marksEntered,
      totalRequired,
      missingMarks,
      stage: "marks_in",
      stageLabel: suppressCandidateEotMissing ? eotApp.badge : deriveStageLabel(totalStudents, percent),
      percent,
      anomalies,
      eotApplicable: eotApp.applies,
      candidateBadge: !eotApp.applies ? eotApp.badge : null,
    };
  });

  const classStatuses: ClassReportingStatus[] =
    department === "theology"
      ? theologyClassStatuses
      : department === "secular"
      ? secularClassStatuses
      : [...secularClassStatuses, ...theologyClassStatuses];

  return {
    secularClassStatuses,
    theologyClassStatuses,
    classStatuses,
    totalRequiredEotSecular,
    totalRequiredEotTheology,
    excludedEotEnrollmentIds,
  };
}

export function computeExamBreakdown(params: {
  department: "secular" | "theology" | "both";
  circularMarks: MarkRowRecord[];
  theologyMarks: MarkRowRecord[];
  totalRequiredSecular: number;
  totalRequiredTheology: number;
  totalRequiredEotSecular?: number;
  totalRequiredEotTheology?: number;
  excludedEotEnrollmentIds?: Set<string>;
}): ExamBreakdownTelemetry {
  const {
    department,
    circularMarks,
    theologyMarks,
    totalRequiredSecular,
    totalRequiredTheology,
    totalRequiredEotSecular,
    totalRequiredEotTheology,
    excludedEotEnrollmentIds,
  } = params;

  const activeSecular = department === "theology" ? [] : circularMarks;
  const activeTheology = department === "secular" ? [] : theologyMarks;
  const combined = [...activeSecular, ...activeTheology];

  const botScores: number[] = [];
  const motScores: number[] = [];
  const eotScores: number[] = [];

  // BOT applies to secular subjects only
  for (const m of activeSecular) {
    const v = toNumericScore(m.bot_score);
    if (v !== null && v >= 0 && v <= 100) botScores.push(v);
  }
  for (const m of combined) {
    const mot = toNumericScore(m.mot_score);
    if (mot !== null && mot >= 0 && mot <= 100) motScores.push(mot);
    if (!excludedEotEnrollmentIds || !excludedEotEnrollmentIds.has(m.enrollment_id)) {
      const eot = toNumericScore(m.eot_score);
      if (eot !== null && eot >= 0 && eot <= 100) eotScores.push(eot);
    }
  }

  const totalCombinedSlots =
    (department === "theology" ? 0 : totalRequiredSecular) +
    (department === "secular" ? 0 : totalRequiredTheology);
  const effectiveEotSecular = totalRequiredEotSecular ?? totalRequiredSecular;
  const effectiveEotTheology = totalRequiredEotTheology ?? totalRequiredTheology;
  const totalEotCombinedSlots =
    (department === "theology" ? 0 : effectiveEotSecular) +
    (department === "secular" ? 0 : effectiveEotTheology);
  const totalBotSlots = department === "theology" ? 0 : totalRequiredSecular;

  const avgOf = (arr: number[]): number | null =>
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  const pctOf = (count: number, denom: number): number =>
    denom > 0 ? Math.min(100, Math.round((count / denom) * 100)) : 0;

  const botAvg = avgOf(botScores);
  const motAvg = avgOf(motScores);
  const eotAvg = avgOf(eotScores);

  const baseline = botAvg ?? motAvg;
  const latest = eotAvg ?? (botAvg !== null ? motAvg : null);
  const progressionDelta =
    baseline !== null && latest !== null && !(botAvg === null && eotAvg === null)
      ? Math.round((latest - baseline) * 10) / 10
      : null;

  return {
    bot: {
      entered: botScores.length,
      completionPct: pctOf(botScores.length, totalBotSlots),
      averageScore: botAvg,
    },
    mot: {
      entered: motScores.length,
      completionPct: pctOf(motScores.length, totalCombinedSlots),
      averageScore: motAvg,
    },
    eot: {
      entered: eotScores.length,
      completionPct: pctOf(eotScores.length, totalEotCombinedSlots),
      averageScore: eotAvg,
    },
    progressionDelta,
  };
}

export function buildDashboardAlerts(params: {
  storedNotifications: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
  }>;
  classStatuses: ClassReportingStatus[];
  examLocks?: { bot?: boolean; mot?: boolean; eot?: boolean };
}): Array<{
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}> {
  const alerts: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
  }> = [];

  const totalAnomalies = params.classStatuses.reduce((sum, c) => sum + c.anomalies, 0);
  if (totalAnomalies > 0) {
    alerts.push({
      id: "live-outliers",
      title: `${totalAnomalies} Out-of-Range Scores`,
      message: "Scores outside 0-100 detected. Audit mark sheets before report printing.",
      time: "Live Audit",
      read: false,
    });
  }

  const lowCohorts = params.classStatuses.filter(
    (c) => c.totalStudents > 0 && c.percent < 50 && c.eotApplicable !== false
  );
  if (lowCohorts.length > 0) {
    const sample = lowCohorts
      .slice(0, 2)
      .map((c) => `${c.className} (${c.percent}%)`)
      .join(", ");
    alerts.push({
      id: "live-low-completion",
      title: `${lowCohorts.length} Cohort(s) Below 50%`,
      message: `Pending marks completion in ${sample}${lowCohorts.length > 2 ? ` +${lowCohorts.length - 2} more` : ""}.`,
      time: "Live Pipeline",
      read: false,
    });
  }

  if (params.examLocks) {
    const locked = (["bot", "mot", "eot"] as const).filter((k) => Boolean(params.examLocks?.[k]));
    if (locked.length > 0) {
      alerts.push({
        id: "live-exam-locks",
        title: `Locked Exams: ${locked.map((k) => k.toUpperCase()).join(", ")}`,
        message: "Editing is restricted to administrators by active exam lock policy.",
        time: "Policy",
        read: true,
      });
    }
  }

  for (const notif of params.storedNotifications) {
    alerts.push(notif);
  }

  return alerts;
}

export function resolveActivityRows(
  logs: any[] | null | undefined,
  teachers: Array<{ id?: string; auth_user_id?: string | null; name?: string | null; email?: string | null }>
): Array<{
  id: string;
  entity_type: string;
  user_name: string;
  action: string;
  created_at: string;
}> {
  const teacherByUserId = new Map<string, string>();
  for (const t of teachers || []) {
    const displayName = t.name || t.email || "";
    if (!displayName) continue;
    if (t.auth_user_id) teacherByUserId.set(String(t.auth_user_id), displayName);
    if (t.id) teacherByUserId.set(String(t.id), displayName);
  }

  return (logs || [])
    .filter((log) => log.action !== "school_customization_config")
    .map((log) => {
      let meta: Record<string, unknown> = {};
      if (log.metadata && typeof log.metadata === "object") {
        meta = log.metadata;
      } else if (typeof log.metadata === "string") {
        try {
          meta = JSON.parse(log.metadata);
        } catch {
          meta = {};
        }
      }
      const resolvedName =
        (typeof meta.user_name === "string" && meta.user_name) ||
        (log.user_id && teacherByUserId.get(String(log.user_id))) ||
        "Teaching Staff";

      return {
        id: String(log.id),
        entity_type: log.action || "system",
        user_name: resolvedName,
        action: String(log.action || "Activity"),
        created_at: log.created_at || new Date().toISOString(),
      };
    });
}
