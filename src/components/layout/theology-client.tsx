"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, BookOpen } from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import { Button } from "@/components/figma-ui/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/figma-ui/ui/dialog";
import { usePowerSync } from '@powersync/react';

export default function TheologyClient({ 
  initialMarks, 
  initialEnrollments, 
  initialSubjects, 
  initialActiveTerm 
}: { 
  initialMarks: any[], 
  initialEnrollments: any[], 
  initialSubjects: any[], 
  initialActiveTerm: any 
  initialSubjects: any[], 
  initialActiveTerm: any 
}) {
  const powerSync = usePowerSync();
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
  const [batchScores, setBatchScores] = useState<Record<string, { id?: string; mot_score: string; eot_score: string }>>({});
  
  const [formData, setFormData] = useState({
    mot_score: "",
    eot_score: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);



  const refetch = async () => {
    try {
      const data = await powerSync.getAll(`
        SELECT 
          tm.id,
          tm.enrollment_id,
          tm.subject_id,
          NULL as term_id,
          tm.mot_mark as mot_score,
          tm.eot_mark as eot_score,
          e.student_id,
          e.theology_class_id,
          s.name as student_name,
          tc.class_name_english,
          tc.class_name_arabic as level,
          sub.subject_name as subject_name_arabic,
          sub.section as level
        FROM theology_marks tm
        LEFT JOIN enrollments e ON tm.enrollment_id = e.id
        LEFT JOIN students s ON e.student_id = s.id
        LEFT JOIN theology_classes tc ON e.theology_class_id = tc.id
        LEFT JOIN subjects sub ON tm.subject_id = sub.id
      `);
      
      const formattedMarks = data.map(row => ({
        id: row.id,
        enrollment_id: row.enrollment_id,
        subject_id: row.subject_id,
        term_id: row.term_id,
        mot_score: row.mot_score,
        eot_score: row.eot_score,
        enrollments: {
          student_id: row.student_id,
          theology_class_id: row.theology_class_id,
          students: { name: row.student_name },
          theology_classes: { class_name_english: row.class_name_english, level: row.level }
        },
        theology_subjects: { subject_name_arabic: row.subject_name_arabic, level: row.level }
      }));
      setMarks(formattedMarks);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!selectedEnrollmentId || !activeTerm) {
      setBatchScores({});
      return;
    }
    const student = enrollments.find(e => e.id === selectedEnrollmentId);
    if (!student) return;

    const studentSubjects = subjects.filter(s => s.level === student.theology_classes?.level);
    const initialScores: typeof batchScores = {};
    
    studentSubjects.forEach(sub => {
      const existingMark = marks.find(m => m.enrollment_id === selectedEnrollmentId && m.subject_id === sub.id && m.term_id === activeTerm.id);
      initialScores[sub.id] = {
        id: existingMark?.id,
        mot_score: existingMark?.mot_score != null ? String(existingMark.mot_score) : "",
        eot_score: existingMark?.eot_score != null ? String(existingMark.eot_score) : ""
      };
    });
    setBatchScores(initialScores);
  }, [selectedEnrollmentId, enrollments, subjects, marks, activeTerm]);

  const filteredMarks = marks.filter(m => {
    const studentName = m.enrollments?.students?.name || "";
    const subjectName = m.theology_subjects?.subject_name_arabic || "";
    return studentName.toLowerCase().includes(search.toLowerCase()) || 
           subjectName.toLowerCase().includes(search.toLowerCase());
  });

  const handleSaveBatch = async () => {
    if (!selectedEnrollmentId) return alert("Student is required");
    setIsSubmitting(true);
    try {
      const student = enrollments.find(e => e.id === selectedEnrollmentId);
      const studentSubjects = subjects.filter(s => s.level === student?.theology_classes?.level);

      await powerSync.writeTransaction(async (tx) => {
        for (const sub of studentSubjects) {
          const scoreObj = batchScores[sub.id];
          if (!scoreObj) continue;

          const hasScores = scoreObj.mot_score !== "" || scoreObj.eot_score !== "";
          if (!hasScores) continue;

          const mot = scoreObj.mot_score === "" ? null : parseFloat(scoreObj.mot_score);
          const eot = scoreObj.eot_score === "" ? null : parseFloat(scoreObj.eot_score);

          if (scoreObj.id) {
            await tx.execute(
              'UPDATE theology_marks SET mot_mark = ?, eot_mark = ? WHERE id = ?',
              [mot, eot, scoreObj.id]
            );
          } else {
            await tx.execute(
              'INSERT INTO theology_marks (id, enrollment_id, subject_id, bot_mark, mot_mark, eot_mark, updated_by) VALUES (uuid(), ?, ?, NULL, ?, ?, ?)',
              [selectedEnrollmentId, sub.id, mot, eot, 'local_user']
            );
          }
        }
      });

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
      const mot = formData.mot_score === "" ? null : parseFloat(formData.mot_score);
      const eot = formData.eot_score === "" ? null : parseFloat(formData.eot_score);
      
      await powerSync.execute(
        'UPDATE theology_marks SET mot_mark = ?, eot_mark = ? WHERE id = ?',
        [mot, eot, selectedMark.id]
      );
      
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
      await powerSync.execute('DELETE FROM theology_marks WHERE id = ?', [selectedMark.id]);
      
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
        title="Theology Hub"
        subtitle={`Manage MOT and EOT marks for ${activeTerm?.term || "the active term"}`}
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
                        {m.enrollments?.theology_classes?.class_name_english || "—"} ({m.enrollments?.theology_classes?.level || "—"})
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#065F46]/10 text-[#065F46] font-medium text-sm">
                          <BookOpen className="w-3.5 h-3.5" />
                          {m.theology_subjects?.subject_name_arabic || m.subject_id}
                        </span>
                      </td>
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
            <DialogTitle>Add Theology Marks</DialogTitle>
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
                    {e.students?.name} ({e.theology_classes?.class_name_english})
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
                        <th className="p-3 w-20 text-center">MOT</th>
                        <th className="p-3 w-20 text-center">EOT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {subjects.filter(s => {
                        const student = enrollments.find(e => e.id === selectedEnrollmentId);
                        return s.level === student?.theology_classes?.level;
                      }).map(sub => {
                        const scoreObj = batchScores[sub.id] || { mot_score: "", eot_score: "" };
                        return (
                          <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-3 font-medium text-gray-700">{sub.subject_name_arabic}</td>
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
              <div className="font-medium text-gray-800">{selectedMark?.theology_subjects?.subject_name_arabic || "—"}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
