import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Check, Info } from "lucide-react";
import { AnimatedButton } from "@/components/AnimatedButton";
import { HeroSection } from "@/components/HeroSection";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useTerms } from "@/hooks/useTerms";
import { api } from "@/services/api/client";
import { ENDPOINTS } from "@/services/api/endpoints";
import type { ScoreType } from "@/hooks/useMarks";
import type { MarksApiResponse } from "@/services/api/types";
import { PageState } from "@/components/PageState";
import { toast } from "sonner";
import { marksEntrySchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

const getGrade = (score: number) => {
  if (score >= 90) return { grade: "A+", color: "#10B981" };
  if (score >= 80) return { grade: "A", color: "#34D399" };
  if (score >= 70) return { grade: "B", color: "#F59E0B" };
  if (score >= 60) return { grade: "C", color: "#FB923C" };
  if (score >= 50) return { grade: "D", color: "#EF4444" };
  return { grade: "F", color: "#DC2626" };
};

type ScoreMap = Record<string, Record<string, number | "">>;
type MarksTrack = "circular" | "theology";

export default function MarksEntryPage() {
  const { classes, loading: classesLoading } = useClasses();
  const { students, loading: studentsLoading, error: studentsError, refetch: refetchStudents } = useStudents();
  const { terms, currentTerm, loading: termsLoading } = useTerms();

  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [scoreType, setScoreType] = useState<ScoreType>("eot");
  const [marksTrack, setMarksTrack] = useState<MarksTrack>("circular");
  const [activeSubjectId, setActiveSubjectId] = useState("");
  const [scores, setScores] = useState<ScoreMap>({});
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [hasTheologyMarks, setHasTheologyMarks] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridError, setGridError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimers = useMemo(() => new Map<string, ReturnType<typeof setTimeout>>(), []);

  useEffect(() => {
    if (classes.length && !selectedClassName) setSelectedClassName(classes[0].name);
  }, [classes, selectedClassName]);

  useEffect(() => {
    if (terms.length && !selectedTermId) {
      setSelectedTermId(currentTerm?.id ?? terms[0].id);
    }
  }, [terms, currentTerm, selectedTermId]);

  const classStudents = useMemo(
    () => students.filter((s) => s.class === selectedClassName && s.enrollmentId),
    [students, selectedClassName]
  );

  const loadMarksGrid = useCallback(async () => {
    if (!selectedTermId || classStudents.length === 0) {
      setSubjects([]);
      setScores({});
      setHasTheologyMarks(false);
      return;
    }

    setGridLoading(true);
    setGridError(null);
    try {
      const responses = await Promise.all(
        classStudents.map((s) =>
          api.get<MarksApiResponse>(ENDPOINTS.marks, {
            params: { enrollment_id: s.enrollmentId!, term_id: selectedTermId },
          })
        )
      );

      const theologyAvailable = (responses[0]?.theology_marks?.length ?? 0) > 0;
      setHasTheologyMarks(theologyAvailable);

      const subjectList =
        marksTrack === "theology"
          ? (responses[0]?.theology_marks?.map((m) => ({
              id: m.subject_id,
              name: m.subject_name_arabic,
            })) ?? [])
          : (responses[0]?.circular_marks?.map((m) => ({
              id: m.subject_id,
              name: m.subject_name,
            })) ?? []);

      setSubjects(subjectList);
      setActiveSubjectId((prev) => {
        if (prev && subjectList.some((s) => s.id === prev)) return prev;
        return subjectList[0]?.id || "";
      });

      const nextScores: ScoreMap = {};
      classStudents.forEach((student, idx) => {
        const row: Record<string, number | ""> = {};
        const markRows =
          marksTrack === "theology"
            ? responses[idx]?.theology_marks ?? []
            : responses[idx]?.circular_marks ?? [];
        for (const subj of markRows) {
          const val = scoreType === "mot" ? subj.mot_score : subj.eot_score;
          row[subj.subject_id] = val ?? "";
        }
        nextScores[student.enrollmentId!] = row;
      });
      setScores(nextScores);
    } catch (err) {
      setGridError(err instanceof Error ? err.message : "Failed to load marks");
    } finally {
      setGridLoading(false);
    }
  }, [classStudents, selectedTermId, scoreType, marksTrack]);

  useEffect(() => {
    void loadMarksGrid();
  }, [loadMarksGrid]);

  const persistScore = useCallback(
    (enrollmentId: string, subjectId: string, value: number | "") => {
      const key = `${enrollmentId}-${subjectId}`;
      const existing = saveTimers.get(key);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        if (value === "" || !selectedTermId) return;
        const validation = marksEntrySchema.safeParse({
          enrollmentId,
          termId: selectedTermId,
          score: value,
        });
        if (!validation.success) {
          logger.warn('Marks entry validation failed', { enrollmentId, subjectId, value, issues: validation.error.issues });
          toast.error('Invalid score entry. Please review the value.');
          return;
        }

        setSaving(true);
        try {
          const payload =
            marksTrack === "theology"
              ? {
                  enrollment_id: enrollmentId,
                  term_id: selectedTermId,
                  score_type: scoreType,
                  theology_marks: [{ subject_id: subjectId, score: value }],
                }
              : {
                  enrollment_id: enrollmentId,
                  term_id: selectedTermId,
                  score_type: scoreType,
                  circular_marks: [{ subject_id: subjectId, score: value }],
                };
          await api.post(ENDPOINTS.marks, payload);
          setLastSaved(new Date());
        } catch {
          toast.error("Failed to save mark");
        } finally {
          setSaving(false);
        }
      }, 700);

      saveTimers.set(key, timer);
    },
    [saveTimers, selectedTermId, scoreType, marksTrack]
  );

  const handleMarkChange = (enrollmentId: string, subjectId: string, raw: string) => {
    const num = raw === "" ? "" : Math.min(100, Math.max(0, parseInt(raw, 10) || 0));
    setScores((prev) => ({
      ...prev,
      [enrollmentId]: { ...prev[enrollmentId], [subjectId]: num },
    }));
    if (num !== "") persistScore(enrollmentId, subjectId, num);
  };

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? subjects[0];
  const pageLoading = classesLoading || studentsLoading || termsLoading;

  return (
    <PageState
      loading={pageLoading}
      error={studentsError}
      onRetry={refetchStudents}
      empty={!pageLoading && classStudents.length === 0}
      emptyTitle="No students in this class"
      emptyMessage="Select another class or enroll students first."
    >
      <div>
        <HeroSection
          title="Marks Entry"
          subtitle="Enter and manage student academic scores for assessments"
        />
        <ScrollReveal delay={0.1}>
          <div className="flex items-center gap-3">
            {saving && (
              <span className="flex items-center gap-1.5" style={{ fontSize: "12px", color: "#6B7280" }}>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
              </span>
            )}
            {!saving && lastSaved && (
              <span className="flex items-center gap-1.5" style={{ fontSize: "12px", color: "#10B981" }}>
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="flex flex-wrap gap-4 mb-6 p-4 rounded-2xl" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <label style={{ fontSize: "13px", color: "#6B7280", fontWeight: 600 }}>Class:</label>
            <select value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)} className="pl-3 pr-8 py-2 rounded-xl border appearance-none" style={{ border: "1px solid #E5E7EB", background: "white", fontSize: "13px", fontWeight: 600 }}>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label style={{ fontSize: "13px", color: "#6B7280", fontWeight: 600 }}>Term:</label>
            <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)} className="pl-3 pr-8 py-2 rounded-xl border appearance-none" style={{ border: "1px solid #E5E7EB", background: "white", fontSize: "13px", fontWeight: 600 }}>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label style={{ fontSize: "13px", color: "#6B7280", fontWeight: 600 }}>Assessment:</label>
            <select value={scoreType} onChange={(e) => setScoreType(e.target.value as ScoreType)} className="pl-3 pr-8 py-2 rounded-xl border appearance-none" style={{ border: "1px solid #E5E7EB", background: "white", fontSize: "13px", fontWeight: 600 }}>
              <option value="mot">Mid of Term (MOT)</option>
              <option value="eot">End of Term (EOT)</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(245,158,11,0.1)" }}>
            <Info className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <span style={{ fontSize: "12px", color: "#92400E" }}>Auto-save after 700ms when you edit a score.</span>
          </div>
        </div>
        </ScrollReveal>

        <ScrollReveal delay={0.12}>
          <div className="flex gap-2 mb-4">
            <AnimatedButton
              onClick={() => setMarksTrack("circular")}
              className="px-4 py-2 rounded-xl"
              style={{
                background: marksTrack === "circular" ? "#065F46" : "white",
                color: marksTrack === "circular" ? "white" : "#6B7280",
                border: marksTrack === "circular" ? "none" : "1px solid #E5E7EB",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Circular Subjects
            </AnimatedButton>
            {hasTheologyMarks && (
              <AnimatedButton
                onClick={() => setMarksTrack("theology")}
                className="px-4 py-2 rounded-xl"
                style={{
                  background: marksTrack === "theology" ? "#065F46" : "white",
                  color: marksTrack === "theology" ? "white" : "#6B7280",
                  border: marksTrack === "theology" ? "none" : "1px solid #E5E7EB",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Theology Subjects
              </AnimatedButton>
            )}
          </div>
        </ScrollReveal>

        {subjects.length > 0 && (
          <ScrollReveal delay={0.2}>
            <div className="flex overflow-x-auto gap-2 mb-6 pb-1">
              {subjects.map((tab) => (
                <AnimatedButton
                  key={tab.id}
                  onClick={() => setActiveSubjectId(tab.id)}
                  className="flex-shrink-0 px-4 py-2 rounded-xl transition-all"
                  style={{
                    background: activeSubject?.id === tab.id ? "#065F46" : "white",
                    color: activeSubject?.id === tab.id ? "white" : "#6B7280",
                    border: activeSubject?.id === tab.id ? "none" : "1px solid #E5E7EB",
                    fontSize: "13px",
                    fontWeight: activeSubject?.id === tab.id ? 600 : 400,
                  }}
                >
                  {tab.name}
                </AnimatedButton>
              ))}
            </div>
          </ScrollReveal>
        )}

        <PageState loading={gridLoading} error={gridError} onRetry={loadMarksGrid}>
          <ScrollReveal delay={0.25}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.07)", background: "#FAFAFA" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>{activeSubject?.name ?? "Subject"}</h3>
                <p style={{ fontSize: "12px", color: "#9CA3AF" }}>{selectedClassName} · {scoreType.toUpperCase()} · Maximum score: 100</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#FAFAFA" }}>
                      <th className="px-6 py-3 text-left" style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 600 }}>#</th>
                      <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 600 }}>Student Name</th>
                      <th className="px-4 py-3 text-center" style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 600 }}>Score /100</th>
                      <th className="px-4 py-3 text-center" style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 600 }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student, idx) => {
                      const enrollmentId = student.enrollmentId!;
                      const subjectId = activeSubject?.id ?? "";
                      const raw = scores[enrollmentId]?.[subjectId];
                      const score = typeof raw === "number" ? raw : 0;
                      const hasScore = typeof raw === "number";
                      const { grade, color } = getGrade(hasScore ? score : 0);
                      return (
                        <tr key={enrollmentId} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                          <td className="px-6 py-3.5" style={{ fontSize: "13px", color: "#9CA3AF" }}>{idx + 1}</td>
                          <td className="px-4 py-3.5" style={{ fontSize: "13.5px", fontWeight: 600, color: "#374151" }}>{student.name}</td>
                          <td className="px-4 py-3.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={raw === "" ? "" : raw}
                              onChange={(e) => handleMarkChange(enrollmentId, subjectId, e.target.value)}
                              className="w-20 text-center py-2 rounded-xl outline-none mx-auto block"
                              style={{ border: "2px solid rgba(0,0,0,0.1)", fontWeight: 700, color }}
                            />
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="px-3 py-1 rounded-full font-bold" style={{ background: color + "18", color, fontSize: "13px" }}>
                              {hasScore ? grade : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollReveal>
        </PageState>
      </div>
    </PageState>
  );
}
