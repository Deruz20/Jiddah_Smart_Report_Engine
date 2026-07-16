"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Edit, Trash2, GraduationCap, ChevronDown, Save } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type GradingRemark = {
  id: string;
  min_score: number;
  max_score: number;
  grade: string;
  remark: string;
};

export function RemarksClient() {
  const [remarks, setRemarks] = useState<GradingRemark[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Partial<GradingRemark>>({});


  useEffect(() => {
    fetchRemarks();
  }, []);

  const fetchRemarks = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      
      const { data, error } = await supabase
        .from("grading_remarks")
        .select("*")
        .eq("teacher_id", user.id)
        .order("max_score", { ascending: false });

      if (error && error.code !== "42P01") { // Ignore missing table error initially
        console.error("Error fetching remarks:", error);
      } else if (data) {
        setRemarks(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (formValues.min_score === undefined || formValues.max_score === undefined || !formValues.grade || !formValues.remark) {
      alert("Please fill all fields");
      return;
    }

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const payload = {
        teacher_id: user.id,
        min_score: Number(formValues.min_score),
        max_score: Number(formValues.max_score),
        grade: formValues.grade,
        remark: formValues.remark,
      };

      if (isEditing === "new") {
        const { error } = await supabase.from("grading_remarks").insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grading_remarks").update(payload).eq("id", isEditing);
        if (error) throw error;
      }

      setIsEditing(null);
      setFormValues({});
      fetchRemarks();
    } catch (error: any) {
      alert("Error saving remark: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this remark?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("grading_remarks").delete().eq("id", id);
      if (error) throw error;
      fetchRemarks();
    } catch (error: any) {
      alert("Error deleting remark: " + error.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" /> Smart Grading Remarks
            </h2>
            <p className="text-sm text-slate-500 mt-1">Configure standard comments that auto-fill based on student scores.</p>
          </div>
          <button
            onClick={() => {
              setIsEditing("new");
              setFormValues({ min_score: 0, max_score: 100, grade: "A", remark: "Excellent performance" });
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Rule
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {remarks.length === 0 && isEditing !== "new" && (
            <div className="p-12 text-center text-slate-400">
              <GraduationCap className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p>No grading remarks configured yet.</p>
            </div>
          )}

          <AnimatePresence>
            {isEditing === "new" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-6 bg-emerald-50/50">
                <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Min Score</label>
                    <input type="number" value={formValues.min_score} onChange={e => setFormValues({...formValues, min_score: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Max Score</label>
                    <input type="number" value={formValues.max_score} onChange={e => setFormValues({...formValues, max_score: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Grade</label>
                    <input type="text" value={formValues.grade} onChange={e => setFormValues({...formValues, grade: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Remark</label>
                    <input type="text" value={formValues.remark} onChange={e => setFormValues({...formValues, remark: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 flex justify-center"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setIsEditing(null)} className="flex-1 bg-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-300 font-semibold text-xs">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}

            {remarks.map(remark => (
              <div key={remark.id} className="p-4 hover:bg-slate-50 transition-colors group">
                {isEditing === remark.id ? (
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-2"><input type="number" value={formValues.min_score} onChange={e => setFormValues({...formValues, min_score: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg text-sm" /></div>
                    <div className="col-span-2"><input type="number" value={formValues.max_score} onChange={e => setFormValues({...formValues, max_score: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg text-sm" /></div>
                    <div className="col-span-2"><input type="text" value={formValues.grade} onChange={e => setFormValues({...formValues, grade: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm" /></div>
                    <div className="col-span-4"><input type="text" value={formValues.remark} onChange={e => setFormValues({...formValues, remark: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm" /></div>
                    <div className="col-span-2 flex gap-2">
                      <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 flex justify-center"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setIsEditing(null)} className="flex-1 bg-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-300 font-semibold text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center justify-center w-16 h-16 bg-slate-100 rounded-xl border border-slate-200">
                        <span className="text-xl font-bold text-emerald-700">{remark.grade}</span>
                        <span className="text-[10px] font-bold text-slate-400">{remark.min_score} - {remark.max_score}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{remark.remark}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setIsEditing(remark.id); setFormValues(remark); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(remark.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
