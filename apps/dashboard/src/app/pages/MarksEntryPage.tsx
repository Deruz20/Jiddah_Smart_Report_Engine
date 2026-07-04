import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Check, Info } from "lucide-react";
import { AnimatedButton } from "@/components/AnimatedButton";
import { HeroSection } from "@/components/HeroSection";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useClasses } from "@/hooks/useClasses";
import { useEnrollments } from "@/hooks/useEnrollments";
import { useTerms } from "@/hooks/useTerms";
import { api } from "@/services/api/client";
import { ENDPOINTS } from "@/services/api/endpoints";
import type { ScoreType } from "@/hooks/useMarks";
import type { MarksApiResponse } from "@/services/api/types";
import { PageState } from "@/components/PageState";
import { toast } from "sonner";
import { marksEntrySchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { motion, AnimatePresence } from "framer-motion";

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
  const [selectedClassName, setSelectedClassName] = useState("");
  const { enrollments, loading: studentsLoading, error: studentsError, refetch: refetchStudents } = useEnrollments(selectedClassName);
  const { terms, currentTerm, loading: termsLoading } = useTerms();

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

  // If user switches to Theology while BOT is selected, switch to MOT since Theology has no BOT
  useEffect(() => {
    if (marksTrack === "theology" && scoreType === "bot") {
      setScoreType("mot");
    }
  }, [marksTrack, scoreType]);

  const classStudents = useMemo(() => {
    return enrollments.map(e => ({
      id: e.admission_number || e.enrollment_id,
      enrollmentId: e.enrollment_id,
      name: e.name,
      class: e.circular_class
    }));
  }, [enrollments]);

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
            params: { enrollment_id: s.enrollmentId!, term_id: selectedTermId, score_type: scoreType },
          })
        )
      );

      const theologyAvailable = (responses[0]?.theology_marks?.length ?? 0) > 0;
      setHasTheologyMarks(theologyAvailable);

      const subjectList =
        marksTrack === "theology"
          ? (responses[0]?.theology_marks?.map((m: any) => ({
              id: m.subject_id,
              name: m.subject_name_arabic,
            })) ?? [])
          : (responses[0]?.circular_marks?.map((m: any) => ({
              id: m.subject_id,
              name: m.subject_name,
            })) ?? []);

      setSubjects(subjectList);
      setActiveSubjectId((prev) => {
        if (prev && subjectList.some((s: any) => s.id === prev)) return prev;
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
          const val = scoreType === "bot" ? subj.bot_score : scoreType === "mot" ? subj.mot_score : subj.eot_score;
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <AnimatedButton
                onClick={() => setMarksTrack("circular")}
                className="px-5 py-2.5 rounded-xl shadow-sm transition-all"
                style={{
                  background: marksTrack === "circular" ? "#0F172A" : "white",
                  color: marksTrack === "circular" ? "white" : "#64748B",
                  border: marksTrack === "circular" ? "1px solid #0F172A" : "1px solid #E2E8F0",
                  fontSize: "13.5px",
                  fontWeight: marksTrack === "circular" ? 700 : 600,
                }}
              >
                Circular (Standard)
              </AnimatedButton>
              {hasTheologyMarks && (
                <AnimatedButton
                  onClick={() => setMarksTrack("theology")}
                  className="px-5 py-2.5 rounded-xl shadow-sm transition-all"
                  style={{
                    background: marksTrack === "theology" ? "#4338CA" : "white",
                    color: marksTrack === "theology" ? "white" : "#64748B",
                    border: marksTrack === "theology" ? "1px solid #4338CA" : "1px solid #E2E8F0",
                    fontSize: "13.5px",
                    fontWeight: marksTrack === "theology" ? 700 : 600,
                  }}
                >
                  Theology (Islamic)
                </AnimatedButton>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {saving && (
                  <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-500 font-semibold text-[12px]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </motion.span>
                )}
                {!saving && lastSaved && (
                  <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg text-emerald-600 font-bold text-[12px] border border-emerald-100">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="flex flex-wrap gap-4 mb-6 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-[13px] text-slate-500 font-bold">Class:</label>
              <select value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)} className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 appearance-none text-[13.5px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 transition-all">
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[13px] text-slate-500 font-bold">Term:</label>
              <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)} className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 appearance-none text-[13.5px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 transition-all">
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[13px] text-slate-500 font-bold">Assessment:</label>
              <select value={scoreType} onChange={(e) => setScoreType(e.target.value as ScoreType)} className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 appearance-none text-[13.5px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 transition-all">
                {marksTrack === "circular" && <option value="bot">Beginning of Term (BOT)</option>}
                <option value="mot">Mid of Term (MOT)</option>
                <option value="eot">End of Term (EOT)</option>
              </select>
            </div>
            <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
              <Info className="w-4 h-4 text-amber-500" />
              <span className="text-[12px] font-semibold text-amber-700">Auto-save on edit</span>
            </div>
          </div>
        </ScrollReveal>

        {subjects.length > 0 && (
          <ScrollReveal delay={0.2}>
            <div className="flex overflow-x-auto gap-2 mb-6 pb-2 hide-scrollbar">
              {subjects.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubjectId(tab.id)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl transition-all shadow-sm border ${
                    activeSubject?.id === tab.id 
                    ? (marksTrack === "circular" ? "bg-slate-900 text-white border-slate-900" : "bg-indigo-600 text-white border-indigo-600") 
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  style={{
                    fontSize: "13px",
                    fontWeight: activeSubject?.id === tab.id ? 700 : 600,
                  }}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </ScrollReveal>
        )}

        <PageState loading={gridLoading} error={gridError} onRetry={loadMarksGrid}>
          <ScrollReveal delay={0.25}>
            <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-[16px] font-bold text-slate-800">{activeSubject?.name ?? "Subject"}</h3>
                  <p className="text-[13px] font-semibold text-slate-400 mt-0.5">{selectedClassName} · {scoreType.toUpperCase()} · Max 100</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Student Name</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-40">Score /100</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-32">Grade</th>
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
                        <motion.tr 
                          key={enrollmentId} 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-0"
                        >
                          <td className="px-6 py-4 text-[13px] font-semibold text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-4 text-[14px] font-bold text-slate-700">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `hsl(${(student.id.charCodeAt(3) * 37) % 360}, 60%, 90%)` }}>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: `hsl(${(student.id.charCodeAt(3) * 37) % 360}, 60%, 35%)` }}>
                                  {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                </span>
                              </div>
                              {student.name}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={raw === "" ? "" : raw}
                              onChange={(e) => handleMarkChange(enrollmentId, subjectId, e.target.value)}
                              className="w-24 text-center py-2.5 rounded-xl outline-none mx-auto block bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                              style={{ 
                                border: hasScore ? `2px solid ${color}40` : "2px solid #E2E8F0", 
                                fontWeight: 800, 
                                color: hasScore ? color : "#64748B",
                                fontSize: "15px"
                              }}
                              placeholder="-"
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <AnimatePresence mode="popLayout">
                              {hasScore ? (
                                <motion.span 
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  key="grade"
                                  className="inline-block px-3 py-1 rounded-lg font-bold shadow-sm" 
                                  style={{ background: color + "15", color, fontSize: "14px", border: `1px solid ${color}30` }}
                                >
                                  {grade}
                                </motion.span>
                              ) : (
                                <motion.span key="empty" className="inline-block text-slate-300 font-bold text-[14px]">
                                  —
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </td>
                        </motion.tr>
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
