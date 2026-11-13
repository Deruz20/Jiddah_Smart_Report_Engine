// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Search, BookOpen } from "lucide-react";
import { MoreActionsMenu } from "@/components/ui/more-actions-menu";
import { HeroSection } from "@/components/HeroSection";
import { Button } from "@/components/figma-ui/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/figma-ui/ui/dialog";
import {
  broadcastMarksUpdated,
  offlineFetchJson,
  submitMutationWithOfflineFallback,
} from "@/lib/offline-sync";
import { invalidateClientCache } from "@/lib/client-cache";

const CircularMarkRowItem = React.memo(function CircularMarkRowItem({
  mark,
  onEdit,
  onDelete,
}: {
  mark: any;
  onEdit: (m: any) => void;
  onDelete: (m: any) => void;
}) {
  return (
    <tr className="hover:bg-[#F3F7F5]/60 dark:hover:bg-[#17221E]/60 transition-colors">
      <td className="px-4 py-2.5">
        <div className="font-semibold text-xs text-[#111827] dark:text-[#F3F7F5]">
          {mark.enrollments?.students?.name || "Unknown"}
        </div>
      </td>
      <td className="px-4 py-2.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
        {mark.enrollments?.circular_classes?.class_name || "--"} (
        {mark.enrollments?.circular_classes?.section || "--"})
      </td>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0D5C3A]/10 dark:bg-emerald-500/15 text-[#0D5C3A] dark:text-emerald-300 font-medium text-xs">
          <BookOpen className="w-3.5 h-3.5" />
          {mark.circular_subjects?.subject_name || mark.subject_id}
        </span>
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-[#111827] dark:text-[#F3F7F5] tabular-nums">{mark.bot_score ?? "--"}</td>
      <td className="px-4 py-2.5 font-mono text-xs text-[#111827] dark:text-[#F3F7F5] tabular-nums">{mark.mot_score ?? "--"}</td>
      <td className="px-4 py-2.5 font-mono text-xs text-[#111827] dark:text-[#F3F7F5] tabular-nums">{mark.eot_score ?? "--"}</td>
      <td className="px-4 py-2.5 text-right">
        <MoreActionsMenu
          items={[
            {
              label: "Edit Mark",
              icon: Edit,
              onClick: () => onEdit(mark),
            },
            {
              label: "Delete Mark",
              icon: Trash2,
              destructive: true,
              onClick: () => onDelete(mark),
            },
          ]}
          align="end"
        />
      </td>
    </tr>
  );
});

export default function CircularClient({
  initialMarks,
  initialEnrollments,
  initialSubjects,
  initialActiveTerm,
}: {
  initialMarks: any[];
  initialEnrollments: any[];
  initialSubjects: any[];
  initialActiveTerm: any;
}) {
  const router = useRouter();
  const [marks, setMarks] = useState(initialMarks);
  const [enrollments] = useState(initialEnrollments);
  const [subjects] = useState(initialSubjects);
  const [activeTerm] = useState(initialActiveTerm);

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedMark, setSelectedMark] = useState<any>(null);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [batchScores, setBatchScores] = useState<
    Record<string, { id?: string; bot_score: string; mot_score: string; eot_score: string }>
  >({});

  const [formData, setFormData] = useState({
    bot_score: "",
    mot_score: "",
    eot_score: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const qs = activeTerm?.id ? `?term_id=${encodeURIComponent(activeTerm.id)}` : "";
      const { data } = await offlineFetchJson<{ data?: any[] }>(`/api/circular-marks${qs}`, {
        cacheKey: `circular_marks_${activeTerm?.id || "all"}`,
        forceNetwork: true,
      });
      if (Array.isArray(data?.data)) {
        setMarks(data.data);
      }
    } catch {
      // Retain optimistic local view when offline
    }
  }, [activeTerm?.id]);

  useEffect(() => {
    if (!selectedEnrollmentId || !activeTerm) {
      setBatchScores({});
      return;
    }
    const student = enrollments.find((e) => e.id === selectedEnrollmentId);
    if (!student) return;

    const studentSubjects = subjects.filter(
      (s) => s.section === student.circular_classes?.section
    );
    const initialScores: typeof batchScores = {};

    studentSubjects.forEach((sub) => {
      const existingMark = marks.find(
        (m) =>
          m.enrollment_id === selectedEnrollmentId &&
          m.subject_id === sub.id &&
          (!m.term_id || m.term_id === activeTerm.id)
      );
      initialScores[sub.id] = {
        id: existingMark?.id,
        bot_score: existingMark?.bot_score != null ? String(existingMark.bot_score) : "",
        mot_score: existingMark?.mot_score != null ? String(existingMark.mot_score) : "",
        eot_score: existingMark?.eot_score != null ? String(existingMark.eot_score) : "",
      };
    });
    setBatchScores(initialScores);
  }, [selectedEnrollmentId, enrollments, subjects, marks, activeTerm]);

  const filteredMarks = marks.filter((m) => {
    const studentName = m.enrollments?.students?.name || "";
    const subjectName = m.circular_subjects?.subject_name || "";
    const q = search.toLowerCase();
    return studentName.toLowerCase().includes(q) || subjectName.toLowerCase().includes(q);
  });

  const handleSaveBatch = async () => {
    if (!selectedEnrollmentId || !activeTerm?.id) {
      toast.warning("Student and active term are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const student = enrollments.find((e) => e.id === selectedEnrollmentId);
      const studentSubjects = subjects.filter(
        (s) => s.section === student?.circular_classes?.section
      );

      const entriesToSave: any[] = [];
      for (const sub of studentSubjects) {
        const scoreObj = batchScores[sub.id];
        if (!scoreObj) continue;
        const hasScores =
          scoreObj.bot_score !== "" || scoreObj.mot_score !== "" || scoreObj.eot_score !== "";
        if (!hasScores) continue;

        const bot = scoreObj.bot_score === "" ? null : parseFloat(scoreObj.bot_score);
        const mot = scoreObj.mot_score === "" ? null : parseFloat(scoreObj.mot_score);
        const eot = scoreObj.eot_score === "" ? null : parseFloat(scoreObj.eot_score);
        if (
          (bot !== null && (Number.isNaN(bot) || bot < 0 || bot > 100)) ||
          (mot !== null && (Number.isNaN(mot) || mot < 0 || mot > 100)) ||
          (eot !== null && (Number.isNaN(eot) || eot < 0 || eot > 100))
        ) {
          throw new Error(
            `Invalid score for ${sub.subject_name}: marks must be between 0 and 100.`
          );
        }
        entriesToSave.push({
          subject_id: sub.id,
          subject_name: sub.subject_name,
          bot_score: bot,
          mot_score: mot,
          eot_score: eot,
        });
      }

      if (entriesToSave.length === 0) {
        toast.info("No scores entered to save.");
        setIsSubmitting(false);
        return;
      }

      let anyQueued = false;
      for (const entry of entriesToSave) {
        const res = await submitMutationWithOfflineFallback({
          url: "/api/circular-marks",
          method: "POST",
          label: `Secular mark (${entry.subject_name})`,
          body: {
            enrollment_id: selectedEnrollmentId,
            subject_id: entry.subject_id,
            term_id: activeTerm.id,
            bot_score: entry.bot_score,
            mot_score: entry.mot_score,
            eot_score: entry.eot_score,
          },
        });
        if (res.error) throw new Error(res.error);
        if (res.queued) anyQueued = true;
      }

      // Optimistic local state merge
      setMarks((prev) => {
        const next = [...prev];
        for (const entry of entriesToSave) {
          const idx = next.findIndex(
            (m) => m.enrollment_id === selectedEnrollmentId && m.subject_id === entry.subject_id
          );
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              bot_score: entry.bot_score,
              mot_score: entry.mot_score,
              eot_score: entry.eot_score,
            };
          } else {
            next.unshift({
              id: `optimistic_${selectedEnrollmentId}_${entry.subject_id}`,
              enrollment_id: selectedEnrollmentId,
              subject_id: entry.subject_id,
              term_id: activeTerm.id,
              bot_score: entry.bot_score,
              mot_score: entry.mot_score,
              eot_score: entry.eot_score,
              enrollments: student,
              circular_subjects: { subject_name: entry.subject_name },
            });
          }
        }
        return next;
      });

      setIsCreateOpen(false);
      setSelectedEnrollmentId("");
      setBatchScores({});
      invalidateClientCache();
      broadcastMarksUpdated({ track: "secular", queued: anyQueued });

      if (anyQueued) {
        toast.info("Saved locally (Offline Mode). Will auto-sync when connection is restored.");
      } else {
        toast.success("Marks saved successfully.");
        await refetch();
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save marks");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedMark?.id) return;
    setIsSubmitting(true);
    try {
      const bot = formData.bot_score === "" ? null : parseFloat(formData.bot_score);
      const mot = formData.mot_score === "" ? null : parseFloat(formData.mot_score);
      const eot = formData.eot_score === "" ? null : parseFloat(formData.eot_score);
      if (
        (bot !== null && (Number.isNaN(bot) || bot < 0 || bot > 100)) ||
        (mot !== null && (Number.isNaN(mot) || mot < 0 || mot > 100)) ||
        (eot !== null && (Number.isNaN(eot) || eot < 0 || eot > 100))
      ) {
        toast.error("Marks must be between 0 and 100.");
        setIsSubmitting(false);
        return;
      }

      const res = await submitMutationWithOfflineFallback({
        url: "/api/circular-marks",
        method: "PUT",
        label: "Update secular mark",
        body: {
          id: selectedMark.id,
          bot_score: bot,
          mot_score: mot,
          eot_score: eot,
        },
      });
      if (res.error) throw new Error(res.error);

      setMarks((prev) =>
        prev.map((m) =>
          m.id === selectedMark.id
            ? { ...m, bot_score: bot, mot_score: mot, eot_score: eot }
            : m
        )
      );

      setIsEditOpen(false);
      invalidateClientCache();
      broadcastMarksUpdated({ track: "secular", queued: res.queued });

      if (res.queued) {
        toast.info("Saved locally (Offline Mode). Will auto-sync when connection is restored.");
      } else {
        toast.success("Marks updated successfully.");
        await refetch();
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update marks");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMark?.id) return;
    setIsSubmitting(true);
    try {
      const res = await submitMutationWithOfflineFallback({
        url: `/api/circular-marks?id=${encodeURIComponent(selectedMark.id)}`,
        method: "DELETE",
        label: "Delete secular mark",
        body: {},
      });
      if (res.error) throw new Error(res.error);

      setMarks((prev) => prev.filter((m) => m.id !== selectedMark.id));
      setIsDeleteOpen(false);
      invalidateClientCache();
      broadcastMarksUpdated({ track: "secular", queued: res.queued });

      if (res.queued) {
        toast.info("Saved locally (Offline Mode). Will auto-sync when connection is restored.");
      } else {
        toast.success("Marks deleted successfully.");
        await refetch();
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete marks");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreate = () => {
    if (!activeTerm) {
      toast.warning("No active term found. Please configure a term first.");
      return;
    }
    setSelectedEnrollmentId("");
    setBatchScores({});
    setIsCreateOpen(true);
  };

  const openEdit = useCallback((mark: any) => {
    setSelectedMark(mark);
    setFormData({
      bot_score: mark.bot_score ?? "",
      mot_score: mark.mot_score ?? "",
      eot_score: mark.eot_score ?? "",
    });
    setIsEditOpen(true);
  }, []);

  const openDelete = useCallback((mark: any) => {
    setSelectedMark(mark);
    setIsDeleteOpen(true);
  }, []);

  return (
    <div className="pb-28 md:pb-12 w-full">
      <HeroSection
        title="Secular Hub"
        subtitle={`Manage BOT, MOT, and EOT marks for ${activeTerm?.label || activeTerm?.term || "the active term"}`}
        actions={
          <Button
            onClick={openCreate}
            className="h-9 bg-[#0D5C3A] hover:bg-[#0A472C] text-white shadow-sm transition-all rounded-xl flex items-center text-xs font-bold px-3.5"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Marks
          </Button>
        }
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 mt-5 sm:mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] dark:text-[#9CA3AF]" />
            <input
              placeholder="Search students or subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-xl border border-[#D5DDD8] dark:border-[#24332E] bg-white dark:bg-[#0D1412] pl-9 pr-3 text-xs text-[#111827] dark:text-[#F3F7F5] placeholder:text-[#6B7280] dark:placeholder:text-[#9CA3AF] outline-none focus:border-[#0D5C3A] dark:focus:border-[#10B981] transition-colors"
            />
          </div>
        </div>

        {filteredMarks.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-[#111827] dark:text-[#F3F7F5]">No marks found</h3>
            <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">No marks have been recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111916] rounded-2xl border border-[#E6ECE8] dark:border-[#1C2622] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAF9] dark:bg-[#0D1412] border-b border-[#E6ECE8] dark:border-[#1C2622] text-[#6B7280] dark:text-[#9CA3AF] text-xs font-semibold">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">BOT</th>
                    <th className="px-4 py-3">MOT</th>
                    <th className="px-4 py-3">EOT</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6ECE8] dark:divide-[#1C2622]">
                  {filteredMarks.map((m) => (
                    <CircularMarkRowItem
                      key={m.id}
                      mark={m}
                      onEdit={openEdit}
                      onDelete={openDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Secular Marks</DialogTitle>
            <DialogDescription>
              Select student to record scores for all class subjects.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Student</label>
              <select
                value={selectedEnrollmentId}
                onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                className="w-full rounded-xl border px-4 py-2.5 outline-none focus:border-[#10B981] transition"
                style={{ borderColor: "rgba(0,0,0,0.1)", background: "white", color: "#374151" }}
              >
                <option value="">Select student...</option>
                {enrollments.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.students?.name} ({e.circular_classes?.class_name})
                  </option>
                ))}
              </select>
            </div>

            {selectedEnrollmentId && (
              <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden shadow-inner">
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="p-3">Subject</th>
                        <th className="p-3 w-20 text-center">BOT</th>
                        <th className="p-3 w-20 text-center">MOT</th>
                        <th className="p-3 w-20 text-center">EOT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {subjects
                        .filter((s) => {
                          const student = enrollments.find((e) => e.id === selectedEnrollmentId);
                          return s.section === student?.circular_classes?.section;
                        })
                        .map((sub) => {
                          const scoreObj = batchScores[sub.id] || {
                            bot_score: "",
                            mot_score: "",
                            eot_score: "",
                          };
                          return (
                            <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-3 font-medium text-gray-700">{sub.subject_name}</td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  value={scoreObj.bot_score}
                                  onChange={(e) =>
                                    setBatchScores({
                                      ...batchScores,
                                      [sub.id]: { ...scoreObj, bot_score: e.target.value },
                                    })
                                  }
                                  className="h-9 w-16 p-1 text-center text-xs font-mono font-bold rounded-lg border border-[#D5DDD8] dark:border-[#24332E] bg-white dark:bg-[#0D1412] text-[#111827] dark:text-[#F3F7F5] outline-none focus:border-[#0D5C3A] dark:focus:border-[#10B981] mx-auto block"
                                  placeholder="--"
                                  min="0"
                                  max="100"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  value={scoreObj.mot_score}
                                  onChange={(e) =>
                                    setBatchScores({
                                      ...batchScores,
                                      [sub.id]: { ...scoreObj, mot_score: e.target.value },
                                    })
                                  }
                                  className="h-9 w-16 p-1 text-center text-xs font-mono font-bold rounded-lg border border-[#D5DDD8] dark:border-[#24332E] bg-white dark:bg-[#0D1412] text-[#111827] dark:text-[#F3F7F5] outline-none focus:border-[#0D5C3A] dark:focus:border-[#10B981] mx-auto block"
                                  placeholder="--"
                                  min="0"
                                  max="100"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  value={scoreObj.eot_score}
                                  onChange={(e) =>
                                    setBatchScores({
                                      ...batchScores,
                                      [sub.id]: { ...scoreObj, eot_score: e.target.value },
                                    })
                                  }
                                  className="h-9 w-16 p-1 text-center text-xs font-mono font-bold rounded-lg border border-[#D5DDD8] dark:border-[#24332E] bg-white dark:bg-[#0D1412] text-[#111827] dark:text-[#F3F7F5] outline-none focus:border-[#0D5C3A] dark:focus:border-[#10B981] mx-auto block"
                                  placeholder="--"
                                  min="0"
                                  max="100"
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveBatch}
              disabled={isSubmitting || !selectedEnrollmentId}
              className="rounded-xl bg-[#065F46] hover:bg-[#047857] text-white"
            >
              {isSubmitting ? "Saving..." : "Save Marks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Marks</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">Student</div>
              <div className="font-semibold text-[#111827] dark:text-[#F3F7F5]">
                {selectedMark?.enrollments?.students?.name || "--"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">Subject</div>
              <div className="font-medium text-[#111827] dark:text-[#F3F7F5]">
                {selectedMark?.circular_subjects?.subject_name || "--"}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1]">BOT Score</label>
                <input
                  type="number"
                  value={formData.bot_score}
                  onChange={(e) => setFormData({ ...formData, bot_score: e.target.value })}
                  className="w-full h-9 rounded-xl border border-[#D5DDD8] dark:border-[#24332E] bg-white dark:bg-[#0D1412] text-[#111827] dark:text-[#F3F7F5] px-3 py-1.5 text-xs font-mono outline-none focus:border-[#0D5C3A] dark:focus:border-[#10B981] transition"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1]">MOT Score</label>
                <input
                  type="number"
                  value={formData.mot_score}
                  onChange={(e) => setFormData({ ...formData, mot_score: e.target.value })}
                  className="w-full h-9 rounded-xl border border-[#D5DDD8] dark:border-[#24332E] bg-white dark:bg-[#0D1412] text-[#111827] dark:text-[#F3F7F5] px-3 py-1.5 text-xs font-mono outline-none focus:border-[#0D5C3A] dark:focus:border-[#10B981] transition"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1]">EOT Score</label>
                <input
                  type="number"
                  value={formData.eot_score}
                  onChange={(e) => setFormData({ ...formData, eot_score: e.target.value })}
                  className="w-full h-9 rounded-xl border border-[#D5DDD8] dark:border-[#24332E] bg-white dark:bg-[#0D1412] text-[#111827] dark:text-[#F3F7F5] px-3 py-1.5 text-xs font-mono outline-none focus:border-[#0D5C3A] dark:focus:border-[#10B981] transition"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isSubmitting}
              className="rounded-xl bg-[#065F46] hover:bg-[#047857] text-white"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Marks</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete these marks? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? "Deleting..." : "Yes, delete marks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
