"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, BookOpen } from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import { Button } from "@/components/figma-ui/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/figma-ui/ui/dialog";
import { createClient } from "@/utils/supabase/client";

export default function CircularClient({ 
  initialMarks, 
  initialEnrollments, 
  initialSubjects, 
  initialActiveTerm 
}: { 
  initialMarks: any[], 
  initialEnrollments: any[], 
  initialSubjects: any[], 
  initialActiveTerm: any 
}) {
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
  const [batchScores, setBatchScores] = useState<Record<string, { id?: string; bot_score: string; mot_score: string; eot_score: string }>>({});
  
  const [formData, setFormData] = useState({
    bot_score: "",
    mot_score: "",
    eot_score: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const refetch = async () => {
    const { data } = await supabase
      .from('circular_marks')
      .select(`
        id,
        enrollment_id,
        subject_id,
        term_id,
        bot_score,
        mot_score,
        eot_score,
        enrollments (
          student_id,
          circular_class_id,
          students ( name ),
          circular_classes ( class_name, section )
        ),
        circular_subjects ( subject_name, section )
      `);
    if (data) setMarks(data);
  };

  useEffect(() => {
    if (!selectedEnrollmentId || !activeTerm) {
      setBatchScores({});
      return;
    }
    const student = enrollments.find(e => e.id === selectedEnrollmentId);
    if (!student) return;

    const studentSubjects = subjects.filter(s => s.section === student.circular_classes?.section);
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

  const filteredMarks = marks.filter(m => {
    const studentName = m.enrollments?.students?.name || "";
    const subjectName = m.circular_subjects?.subject_name || "";
    return studentName.toLowerCase().includes(search.toLowerCase()) || 
           subjectName.toLowerCase().includes(search.toLowerCase());
  });

  const handleSaveBatch = async () => {
    if (!selectedEnrollmentId) return alert("Student is required");
    setIsSubmitting(true);
    try {
      const student = enrollments.find(e => e.id === selectedEnrollmentId);
      const studentSubjects = subjects.filter(s => s.section === student?.circular_classes?.section);

      const promises = studentSubjects.map(async (sub) => {
        const scoreObj = batchScores[sub.id];
        if (!scoreObj) return;

        const hasScores = scoreObj.bot_score !== "" || scoreObj.mot_score !== "" || scoreObj.eot_score !== "";
        if (!hasScores) return;

        const payload = {
          enrollment_id: selectedEnrollmentId,
          subject_id: sub.id,
          term_id: activeTerm?.id,
          bot_score: scoreObj.bot_score === "" ? null : parseFloat(scoreObj.bot_score),
          mot_score: scoreObj.mot_score === "" ? null : parseFloat(scoreObj.mot_score),
          eot_score: scoreObj.eot_score === "" ? null : parseFloat(scoreObj.eot_score)
        };

        if (scoreObj.id) {
          return supabase.from('circular_marks').update(payload).eq('id', scoreObj.id);
        } else {
          return supabase.from('circular_marks').insert([payload]);
        }
      });

      await Promise.all(promises);
      setIsCreateOpen(false);
      setSelectedEnrollmentId("");
      setBatchScores({});
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to save marks");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        bot_score: formData.bot_score === "" ? null : parseFloat(formData.bot_score),
        mot_score: formData.mot_score === "" ? null : parseFloat(formData.mot_score),
        eot_score: formData.eot_score === "" ? null : parseFloat(formData.eot_score)
      };
      
      const { error } = await supabase.from('circular_marks').update(payload).eq('id', selectedMark.id);
      if (error) throw error;
      
      setIsEditOpen(false);
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to update marks");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('circular_marks').delete().eq('id', selectedMark.id);
      if (error) throw error;
      
      setIsDeleteOpen(false);
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to delete marks");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreate = () => {
    if (!activeTerm) {
      return alert("No active term found. Please configure a term first.");
    }
    setSelectedEnrollmentId("");
    setBatchScores({});
    setIsCreateOpen(true);
  };

  const openEdit = (mark: any) => {
    setSelectedMark(mark);
    setFormData({
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
    <div className="pb-12 w-full">
      <HeroSection
        title="Circular Hub"
        subtitle={`Manage BOT, MOT, and EOT marks for ${activeTerm?.term || "the active term"}`}
        actions={
          <Button
            onClick={openCreate}
            className="bg-[#065F46] hover:bg-[#047857] text-white shadow-md shadow-[#065F46]/20 transition-all rounded-xl flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Marks
          </Button>
        }
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              placeholder="Search students or subjects..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm text-slate-700 outline-none focus:border-[#10B981] transition-colors"
            />
          </div>
        </div>

        {filteredMarks.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">No marks found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No marks have been recorded yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
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
                  {filteredMarks.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
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
                        <button onClick={() => openEdit(m)} className="p-2 text-gray-500 hover:text-[#065F46] hover:bg-[#065F46]/10 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => openDelete(m)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
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
            <DialogTitle>Add Circular Marks</DialogTitle>
            <DialogDescription>Select student to record scores for all class subjects.</DialogDescription>
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
                      {subjects.filter(s => {
                        const student = enrollments.find(e => e.id === selectedEnrollmentId);
                        return s.section === student?.circular_classes?.section;
                      }).map(sub => {
                        const scoreObj = batchScores[sub.id] || { bot_score: "", mot_score: "", eot_score: "" };
                        return (
                          <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-3 font-medium text-gray-700">{sub.subject_name}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={scoreObj.bot_score}
                                onChange={e => setBatchScores({
                                  ...batchScores,
                                  [sub.id]: { ...scoreObj, bot_score: e.target.value }
                                })}
                                className="h-8 w-16 p-1 text-center rounded-lg border outline-none focus:border-[#10B981] mx-auto block"
                                placeholder="—"
                                min="0"
                                max="100"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={scoreObj.mot_score}
                                onChange={e => setBatchScores({
                                  ...batchScores,
                                  [sub.id]: { ...scoreObj, mot_score: e.target.value }
                                })}
                                className="h-8 w-16 p-1 text-center rounded-lg border outline-none focus:border-[#10B981] mx-auto block"
                                placeholder="—"
                                min="0"
                                max="100"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={scoreObj.eot_score}
                                onChange={e => setBatchScores({
                                  ...batchScores,
                                  [sub.id]: { ...scoreObj, eot_score: e.target.value }
                                })}
                                className="h-8 w-16 p-1 text-center rounded-lg border outline-none focus:border-[#10B981] mx-auto block"
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
            <Button onClick={handleSaveBatch} disabled={isSubmitting || !selectedEnrollmentId} className="rounded-xl bg-[#065F46] hover:bg-[#047857] text-white">
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
              <div className="text-sm font-semibold text-gray-500">Student</div>
              <div className="font-semibold text-gray-900">{selectedMark?.enrollments?.students?.name || "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-gray-500">Subject</div>
              <div className="font-medium text-gray-800">{selectedMark?.circular_subjects?.subject_name || "—"}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">BOT Score</label>
                <input 
                  type="number"
                  value={formData.bot_score} 
                  onChange={e => setFormData({ ...formData, bot_score: e.target.value })} 
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#10B981] transition"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">MOT Score</label>
                <input 
                  type="number"
                  value={formData.mot_score} 
                  onChange={e => setFormData({ ...formData, mot_score: e.target.value })} 
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#10B981] transition"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">EOT Score</label>
                <input 
                  type="number"
                  value={formData.eot_score} 
                  onChange={e => setFormData({ ...formData, eot_score: e.target.value })} 
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#10B981] transition"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEdit} disabled={isSubmitting} className="rounded-xl bg-[#065F46] hover:bg-[#047857] text-white">
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
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={isSubmitting} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
              {isSubmitting ? "Deleting..." : "Yes, delete marks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
