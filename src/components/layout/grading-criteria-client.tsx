"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, GraduationCap, ChevronDown, Save } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type GradingCriteria = {
  id: string;
  curriculum: 'circular' | 'theology' | null;
  class_id: string | null;
  metric_type: string;
  min_value: number;
  max_value: number;
  output_type: 'grade_label' | 'comment';
  output_text: string;
};

type ClassData = {
  id: string;
  name: string;
  curriculum: 'circular' | 'theology';
};

export function GradingCriteriaClient({ 
  role, 
  userId 
}: { 
  role: string, 
  userId: string 
}) {
  const [criteria, setCriteria] = useState<GradingCriteria[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Partial<GradingCriteria>>({});
  
  // Admin and HT can edit both. DOS Secular can only edit secular. DOS Theology can only edit theology.
  const canEditCircular = ['Administrator', 'Head Teacher', 'DOS Secular'].includes(role);
  const canEditTheology = ['Administrator', 'Head Teacher', 'DOS Theology'].includes(role);
  
  const [activeTab, setActiveTab] = useState<'circular' | 'theology'>(canEditCircular ? 'circular' : 'theology');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      
      // Fetch criteria
      const { data: criteriaData, error: criteriaError } = await supabase
        .from("grading_criteria")
        .select("*")
        .order("max_value", { ascending: false });

      if (criteriaError && criteriaError.code !== '42P01') {
        console.error("Error fetching criteria:", criteriaError);
      } else if (criteriaData) {
        setCriteria(criteriaData as GradingCriteria[]);
      }

      // Fetch classes for dropdowns
      const { data: circularClasses } = await supabase.from('circular_classes').select('id, class_name, section');
      const { data: theologyClasses } = await supabase.from('theology_classes').select('id, class_name_english, class_name_arabic');
      
      const allParsedClasses: ClassData[] = [];
      if (circularClasses) {
        allParsedClasses.push(...circularClasses.map((c: any) => ({ id: c.id, name: `${c.class_name} ${c.section || ''}`.trim(), curriculum: 'circular' as const })));
      }
      if (theologyClasses) {
        allParsedClasses.push(...theologyClasses.map((c: any) => ({ id: c.id, name: c.class_name_arabic || c.class_name_english, curriculum: 'theology' as const })));
      }
      setClasses(allParsedClasses);
      
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (formValues.min_value === undefined || formValues.max_value === undefined || !formValues.metric_type || !formValues.output_type || !formValues.output_text) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const supabase = createClient();
      const payload = {
        curriculum: activeTab === 'circular' ? 'secular' : 'theology',
        class_id: formValues.class_id || null,
        metric_type: formValues.metric_type,
        min_value: Number(formValues.min_value),
        max_value: Number(formValues.max_value),
        output_type: formValues.output_type,
        output_text: formValues.output_text,
      };

      if (isEditing === "new") {
        const { error } = await supabase.from("grading_criteria").insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grading_criteria").update(payload).eq("id", isEditing);
        if (error) throw error;
      }

      setIsEditing(null);
      setFormValues({});
      fetchData();
    } catch (error: any) {
      alert("Error saving rule: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("grading_criteria").delete().eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert("Error deleting rule: " + error.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading criteria...</div>;

  const currentCriteria = criteria.filter(s => s.curriculum === (activeTab === 'circular' ? 'secular' : 'theology') || s.curriculum === null);
  const canEditCurrent = activeTab === 'circular' ? canEditCircular : canEditTheology;
  const currentClasses = classes.filter(c => c.curriculum === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('circular')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'circular' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Secular Curriculum
        </button>
        <button 
          onClick={() => setActiveTab('theology')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'theology' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Theology Curriculum
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {activeTab === 'circular' ? 'Secular' : 'Theology'} Grading Criteria Rules
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Configure dynamic grade thresholds and remarks based on metric rules.
            </p>
          </div>
          {canEditCurrent && (
            <button
              onClick={() => {
                setIsEditing("new");
                setFormValues({ min_value: 0, max_value: 100, metric_type: "subject_score", output_type: "grade_label", output_text: "", class_id: "" });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
            >
              <Plus size={16} />
              Add Rule
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {currentCriteria.map((cr) => (
              <div key={cr.id} className="relative group bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-300 hover:shadow-md transition-all">
                {isEditing === cr.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <select 
                        value={formValues.class_id || ""}
                        onChange={(e) => setFormValues({...formValues, class_id: e.target.value})}
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">All Classes</option>
                        {currentClasses.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        value={formValues.metric_type || ""} 
                        onChange={(e) => setFormValues({...formValues, metric_type: e.target.value})}
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Metric (e.g. subject_score, total_score)"
                        list="metric-options"
                      />
                      <datalist id="metric-options">
                        <option value="subject_score" />
                        <option value="total_score" />
                        <option value="aggregate" />
                      </datalist>
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={formValues.min_value} 
                        onChange={(e) => setFormValues({...formValues, min_value: Number(e.target.value)})}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Min Value"
                      />
                      <span className="text-slate-400 self-center">-</span>
                      <input 
                        type="number" 
                        value={formValues.max_value} 
                        onChange={(e) => setFormValues({...formValues, max_value: Number(e.target.value)})}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Max Value"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <select 
                        value={formValues.output_type || "grade_label"}
                        onChange={(e) => setFormValues({...formValues, output_type: e.target.value as any})}
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="grade_label">Grade Label (e.g., D1)</option>
                        <option value="comment">Comment</option>
                      </select>
                      <input 
                        type="text" 
                        value={formValues.output_text || ""} 
                        onChange={(e) => setFormValues({...formValues, output_text: e.target.value})}
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Output text"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-emerald-700">Save</button>
                      <button onClick={() => setIsEditing(null)} className="flex-1 bg-slate-100 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-200">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center justify-center px-3 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-100">
                        {cr.output_type === 'grade_label' ? 'Label: ' : 'Comment: '}
                        {cr.output_text}
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {cr.min_value} - {cr.max_value}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-800">
                        Applies to: <span className="font-normal text-slate-600">{cr.class_id ? (classes.find(c => c.id === cr.class_id)?.name || 'Unknown Class') : 'All Classes'}</span>
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        Metric: <span className="font-normal text-slate-600 font-mono text-xs px-1.5 py-0.5 bg-slate-100 rounded">{cr.metric_type}</span>
                      </p>
                    </div>

                    {canEditCurrent && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button 
                          onClick={() => {
                            setIsEditing(cr.id);
                            setFormValues(cr);
                          }}
                          className="p-1.5 bg-white text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg shadow-sm"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(cr.id)}
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
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={formValues.class_id || ""}
                      onChange={(e) => setFormValues({...formValues, class_id: e.target.value})}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">All Classes</option>
                      {currentClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      value={formValues.metric_type || ""} 
                      onChange={(e) => setFormValues({...formValues, metric_type: e.target.value})}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Metric (e.g. subject_score, total_score)"
                      list="metric-options"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={formValues.min_value} 
                      onChange={(e) => setFormValues({...formValues, min_value: Number(e.target.value)})}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Min Value"
                    />
                    <span className="text-slate-400 self-center">-</span>
                    <input 
                      type="number" 
                      value={formValues.max_value} 
                      onChange={(e) => setFormValues({...formValues, max_value: Number(e.target.value)})}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Max Value"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={formValues.output_type || "grade_label"}
                      onChange={(e) => setFormValues({...formValues, output_type: e.target.value as any})}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="grade_label">Grade Label (e.g., D1)</option>
                      <option value="comment">Comment</option>
                    </select>
                    <input 
                      type="text" 
                      value={formValues.output_text || ""} 
                      onChange={(e) => setFormValues({...formValues, output_text: e.target.value})}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Output text"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-emerald-700">Save</button>
                    <button onClick={() => setIsEditing(null)} className="flex-1 bg-slate-100 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-200">Cancel</button>
                  </div>
                </div>
              </div>
            )}
            
            {currentCriteria.length === 0 && isEditing !== "new" && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <GraduationCap size={32} className="mx-auto text-slate-300 mb-3" />
                <p>No criteria rules configured for this curriculum.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
