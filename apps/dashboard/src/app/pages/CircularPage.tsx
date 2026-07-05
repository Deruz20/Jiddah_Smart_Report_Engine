import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, Search, BookOpen } from "lucide-react";
import { useCircularData } from "@/hooks/useCircularData";
import { PageState } from "@/components/PageState";
import { HeroSection } from "@/components/HeroSection";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/app/components/ui/dialog";

import { api } from "@/services/api/client";

export default function CircularPage() {
  const { marks, enrollments, subjects, activeTerm, loading, error, refetch } = useCircularData();
  const [search, setSearch] = useState("");
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedMark, setSelectedMark] = useState<any>(null);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [batchScores, setBatchScores] = useState<Record<string, { id?: string; bot_score: string; mot_score: string; eot_score: string }>>({});
  
  const [formData, setFormData] = useState({
    enrollment_id: "",
    subject_id: "",
    bot_score: "",
    mot_score: "",
    eot_score: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When a student is selected in batch create mode, load their subjects and pre-fill existing marks
  useEffect(() => {
    if (!selectedEnrollmentId || !activeTerm) {
      setBatchScores({});
      return;
    }
    const student = enrollments.find(e => e.enrollment_id === selectedEnrollmentId);
    if (!student) return;

    const studentSubjects = subjects.filter(s => s.section === student.section);
    const initialScores: typeof batchScores = {};
    
    studentSubjects.forEach(sub => {
      const existingMark = marks.find(m => m.enrollment_id === selectedEnrollmentId && m.subject_id === sub.id && m.term_id === activeTerm.id);
      initialScores[sub.id] = {
        id: existingMark?.id,
        bot_score: existingMark?.bot_score != null ? String(existingMark.bot_score) : "",
        mot_score: existingMark?.mot_score != null ? String(existingMark.mot_score) : "",
        eot_score: existingMark?.eot_score != null ? String(existingMark.eot_score) : ""
      };
    });
    setBatchScores(initialScores);
  }, [selectedEnrollmentId, enrollments, subjects, marks, activeTerm]);

  // Filter marks
  const filteredMarks = marks.filter(m => {
    const studentName = m.enrollments?.students?.name || "";
    const subjectName = m.circular_subjects?.subject_name || "";
    return studentName.toLowerCase().includes(search.toLowerCase()) || 
           subjectName.toLowerCase().includes(search.toLowerCase());
  });

  const handleSaveBatch = async () => {
    if (!selectedEnrollmentId) return toast.error("Student is required");
    setIsSubmitting(true);
    try {
      const student = enrollments.find(e => e.enrollment_id === selectedEnrollmentId);
      const studentSubjects = subjects.filter(s => s.section === student?.section);

      const promises = studentSubjects.map(async (sub) => {
        const scoreObj = batchScores[sub.id];
        if (!scoreObj) return;

        // Skip saving if all scores are empty
        const hasScores = scoreObj.bot_score !== "" || scoreObj.mot_score !== "" || scoreObj.eot_score !== "";
        if (!hasScores) return;

        const payload = {
          enrollment_id: selectedEnrollmentId,
          subject_id: sub.id,
          term_id: activeTerm?.id,
          bot_score: scoreObj.bot_score,
          mot_score: scoreObj.mot_score,
          eot_score: scoreObj.eot_score
        };

        if (scoreObj.id) {
          // Update existing
          return api.put(`/circular-marks`, { id: scoreObj.id, bot_score: scoreObj.bot_score, mot_score: scoreObj.mot_score, eot_score: scoreObj.eot_score });
        } else {
          // Insert new (backend will upsert if duplicate key matches)
          return api.post("/circular-marks", payload);
        }
      });

      await Promise.all(promises);
      toast.success("Marks saved successfully");
      setIsCreateOpen(false);
      setSelectedEnrollmentId("");
      setBatchScores({});
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save marks");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    setIsSubmitting(true);
    try {
      await api.put(`/circular-marks`, {
        id: selectedMark.id,
        bot_score: formData.bot_score,
        mot_score: formData.mot_score,
        eot_score: formData.eot_score
      });
      toast.success("Marks updated successfully");
      setIsEditOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update marks");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await api.delete(`/circular-marks?id=${selectedMark.id}`);
      toast.success("Marks deleted successfully");
      setIsDeleteOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete marks");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreate = () => {
    if (!activeTerm) {
      return toast.error("No active term found. Please configure a term first.");
    }
    setSelectedEnrollmentId("");
    setBatchScores({});
    setIsCreateOpen(true);
  };

  const openEdit = (mark: any) => {
    setSelectedMark(mark);
    setFormData({
      enrollment_id: mark.enrollment_id,
      subject_id: mark.subject_id,
      bot_score: mark.bot_score ?? "",
      mot_score: mark.mot_score ?? "",
      eot_score: mark.eot_score ?? ""
    });
    setIsEditOpen(true);
  };

  const openDelete = (mark: any) => {
    setSelectedMark(mark);
    setIsDeleteOpen(true);
  };

  return (
    <div className="pb-12">
      <HeroSection
        title="Circular Hub"
        subtitle={`Manage BOT, MOT, and EOT marks for ${activeTerm?.name || "the active term"}`}
        actions={
          <Button
            className="bg-[#065F46] hover:bg-[#047857] text-white shadow-md shadow-[#065F46]/20 transition-all rounded-xl"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Marks
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search students or subjects..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-gray-200 focus-visible:ring-[#065F46]" 
            />
          </div>
        </div>

        <PageState 
          loading={loading} 
          error={error} 
          onRetry={refetch} 
          empty={!loading && !error && filteredMarks.length === 0} 
          emptyTitle="No marks found" 
          emptyMessage="No marks have been recorded yet."
        >
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm font-semibold">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">BOT</th>
                    <th className="px-6 py-4">MOT</th>
                    <th className="px-6 py-4">EOT</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {filteredMarks.map((m, idx) => (
                      <motion.tr
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.05, 0.5) }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{m.enrollments?.students?.name || "Unknown"}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {m.enrollments?.circular_classes?.class_name || "—"} ({m.enrollments?.circular_classes?.section || "—"})
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#065F46]/10 text-[#065F46] font-medium text-sm">
                            <BookOpen className="w-3.5 h-3.5" />
                            {m.circular_subjects?.subject_name || m.subject_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-700">{m.bot_score ?? "—"}</td>
                        <td className="px-6 py-4 font-mono text-gray-700">{m.mot_score ?? "—"}</td>
                        <td className="px-6 py-4 font-mono text-gray-700">{m.eot_score ?? "—"}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(m)} className="h-8 w-8 text-gray-500 hover:text-[#065F46] hover:bg-[#065F46]/10 rounded-lg">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDelete(m)} className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              <AnimatePresence>
                {filteredMarks.map((m, idx) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.05, 0.5) }}
                    className="p-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{m.enrollments?.students?.name || "Unknown"}</div>
                        <div className="text-sm text-gray-600 mt-0.5">
                          {m.enrollments?.circular_classes?.class_name || "—"} ({m.enrollments?.circular_classes?.section || "—"})
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)} className="h-8 w-8 text-gray-500 hover:text-[#065F46] hover:bg-[#065F46]/10 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(m)} className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#065F46]/10 text-[#065F46] font-medium text-sm">
                        <BookOpen className="w-3.5 h-3.5" />
                        {m.circular_subjects?.subject_name || m.subject_id}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">BOT</div>
                        <div className="font-mono text-gray-700">{m.bot_score ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">MOT</div>
                        <div className="font-mono text-gray-700">{m.mot_score ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">EOT</div>
                        <div className="font-mono text-gray-700">{m.eot_score ?? "—"}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </PageState>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-2xl animate-in fade-in zoom-in duration-200">
          <DialogHeader>
            <DialogTitle>Add Circular Marks</DialogTitle>
            <DialogDescription>Select student to record scores for all class subjects.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedEnrollmentId} onValueChange={setSelectedEnrollmentId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {enrollments.map((e: any) => (
                    <SelectItem key={e.enrollment_id} value={e.enrollment_id}>
                      {e.name} ({e.circular_class})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      {subjects.filter(s => {
                        const student = enrollments.find(e => e.enrollment_id === selectedEnrollmentId);
                        return s.section === student?.section;
                      }).map(sub => {
                        const scoreObj = batchScores[sub.id] || { bot_score: "", mot_score: "", eot_score: "" };
                        return (
                          <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-3 font-medium text-gray-700">{sub.subject_name}</td>
                            <td className="p-3">
                              <Input
                                type="number"
                                value={scoreObj.bot_score}
                                onChange={e => setBatchScores({
                                  ...batchScores,
                                  [sub.id]: { ...scoreObj, bot_score: e.target.value }
                                })}
                                className="h-8 w-16 p-1 text-center rounded-lg focus-visible:ring-[#065F46] mx-auto"
                                placeholder="—"
                                min="0"
                                max="100"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                value={scoreObj.mot_score}
                                onChange={e => setBatchScores({
                                  ...batchScores,
                                  [sub.id]: { ...scoreObj, mot_score: e.target.value }
                                })}
                                className="h-8 w-16 p-1 text-center rounded-lg focus-visible:ring-[#065F46] mx-auto"
                                placeholder="—"
                                min="0"
                                max="100"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                value={scoreObj.eot_score}
                                onChange={e => setBatchScores({
                                  ...batchScores,
                                  [sub.id]: { ...scoreObj, eot_score: e.target.value }
                                })}
                                className="h-8 w-16 p-1 text-center rounded-lg focus-visible:ring-[#065F46] mx-auto"
                                placeholder="—"
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
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveBatch} disabled={isSubmitting || !selectedEnrollmentId} className="rounded-xl bg-[#065F46] hover:bg-[#047857]">
              {isSubmitting ? "Saving..." : "Save Marks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl animate-in fade-in zoom-in duration-200">
          <DialogHeader>
            <DialogTitle>Edit Marks</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-gray-500">Student</div>
              <div className="font-semibold text-gray-900">{selectedMark?.enrollments?.students?.name || "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-gray-500">Subject</div>
              <div className="font-medium text-gray-800">{selectedMark?.circular_subjects?.subject_name || "—"}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>BOT Score</Label>
                <Input 
                  type="number"
                  value={formData.bot_score} 
                  onChange={e => setFormData({ ...formData, bot_score: e.target.value })} 
                  className="rounded-xl"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label>MOT Score</Label>
                <Input 
                  type="number"
                  value={formData.mot_score} 
                  onChange={e => setFormData({ ...formData, mot_score: e.target.value })} 
                  className="rounded-xl"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label>EOT Score</Label>
                <Input 
                  type="number"
                  value={formData.eot_score} 
                  onChange={e => setFormData({ ...formData, eot_score: e.target.value })} 
                  className="rounded-xl"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEdit} disabled={isSubmitting} className="rounded-xl bg-[#065F46] hover:bg-[#047857]">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl animate-in fade-in zoom-in duration-200">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Marks</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete these marks? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="rounded-xl">
              {isSubmitting ? "Deleting..." : "Yes, delete marks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
