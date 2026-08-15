"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, GraduationCap, ChevronDown, Save } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type GradingStandard = {
  id: string;
  curriculum: 'circular' | 'theology';
  min_score: number;
  max_score: number;
  grade: string;
  remark: string;
};

export function GradingStandardsClient({ 
  role, 
  userId 
}: { 
  role: string, 
  userId: string 
}) {
  const [standards, setStandards] = useState<GradingStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Partial<GradingStandard>>({});
  
  // Admin and HT can edit both. DOS Secular can only edit secular. DOS Theology can only edit theology.
  const canEditCircular = ['Administrator', 'Head Teacher', 'DOS Secular'].includes(role);
  const canEditTheology = ['Administrator', 'Head Teacher', 'DOS Theology'].includes(role);
  
  const [activeTab, setActiveTab] = useState<'circular' | 'theology'>(canEditCircular ? 'circular' : 'theology');

  useEffect(() => {
    fetchStandards();
  }, []);

  const fetchStandards = async () => {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("grading_standards")
        .select("*")
        .order("max_score", { ascending: false });

      if (error) {
        console.error("Error fetching standards:", error);
      } else if (data) {
        setStandards(data as GradingStandard[]);
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
      const payload = {
        curriculum: activeTab,
        min_score: Number(formValues.min_score),
        max_score: Number(formValues.max_score),
        grade: formValues.grade,
        remark: formValues.remark,
      };

      if (isEditing === "new") {
        const { error } = await supabase.from("grading_standards").insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grading_standards").update(payload).eq("id", isEditing);
        if (error) throw error;
      }

      setIsEditing(null);
      setFormValues({});
      fetchStandards();
    } catch (error: any) {
      alert("Error saving standard: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this standard?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("grading_standards").delete().eq("id", id);
      if (error) throw error;
      fetchStandards();
    } catch (error: any) {
      alert("Error deleting standard: " + error.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading standards...</div>;

  const currentStandards = standards.filter(s => s.curriculum === activeTab);
  const canEditCurrent = activeTab === 'circular' ? canEditCircular : canEditTheology;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('circular')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'circular' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Secular Standards
        </button>
        <button 
          onClick={() => setActiveTab('theology')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'theology' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Theology Standards
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {activeTab === 'circular' ? 'Secular' : 'Theology'} Grading Standards
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Configure the grades and remarks that apply to student scores.
            </p>
          </div>
          {canEditCurrent && (
            <button
              onClick={() => {
                setIsEditing("new");
                setFormValues({ min_score: 0, max_score: 100, grade: "", remark: "" });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
            >
              <Plus size={16} />
              Add Standard
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentStandards.map((st) => (
              <div key={st.id} className="relative group bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-300 hover:shadow-md transition-all">
                {isEditing === st.id ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={formValues.min_score} 
                        onChange={(e) => setFormValues({...formValues, min_score: Number(e.target.value)})}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Min"
                      />
                      <span className="text-slate-400 self-center">-</span>
                      <input 
                        type="number" 
                        value={formValues.max_score} 
                        onChange={(e) => setFormValues({...formValues, max_score: Number(e.target.value)})}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Max"
                      />
                    </div>
                    <input 
                      type="text" 
                      value={formValues.grade} 
                      onChange={(e) => setFormValues({...formValues, grade: e.target.value})}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Grade (e.g. D1)"
                    />
                    <textarea 
                      value={formValues.remark} 
                      onChange={(e) => setFormValues({...formValues, remark: e.target.value})}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none min-h-[60px]"
                      placeholder="Remark (e.g. Excellent)"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-emerald-700">Save</button>
                      <button onClick={() => setIsEditing(null)} className="flex-1 bg-slate-100 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-200">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xl border border-emerald-100">
                        {st.grade}
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {st.min_score} - {st.max_score}%
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-800 mb-1">Standard Remark</p>
                      <p className="text-sm text-slate-600 italic">"{st.remark}"</p>
                    </div>

                    {canEditCurrent && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button 
                          onClick={() => {
                            setIsEditing(st.id);
                            setFormValues(st);
                          }}
                          className="p-1.5 bg-white text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg shadow-sm"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(st.id)}
                          className="p-1.5 bg-white text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg shadow-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            
            {isEditing === "new" && (
              <div className="bg-white border-2 border-emerald-200 border-dashed rounded-xl p-5 shadow-sm">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={formValues.min_score} 
                      onChange={(e) => setFormValues({...formValues, min_score: Number(e.target.value)})}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Min"
                    />
                    <span className="text-slate-400 self-center">-</span>
                    <input 
                      type="number" 
                      value={formValues.max_score} 
                      onChange={(e) => setFormValues({...formValues, max_score: Number(e.target.value)})}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Max"
                    />
                  </div>
                  <input 
                    type="text" 
                    value={formValues.grade} 
                    onChange={(e) => setFormValues({...formValues, grade: e.target.value})}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Grade (e.g. D1)"
                  />
                  <textarea 
                    value={formValues.remark} 
                    onChange={(e) => setFormValues({...formValues, remark: e.target.value})}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none min-h-[60px]"
                    placeholder="Remark (e.g. Excellent)"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-emerald-700">Save</button>
                    <button onClick={() => setIsEditing(null)} className="flex-1 bg-slate-100 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-200">Cancel</button>
                  </div>
                </div>
              </div>
            )}
            
            {currentStandards.length === 0 && isEditing !== "new" && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <GraduationCap size={32} className="mx-auto text-slate-300 mb-3" />
                <p>No standards configured for this curriculum.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
