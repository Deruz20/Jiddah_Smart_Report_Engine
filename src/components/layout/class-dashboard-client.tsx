"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, BookOpen, GraduationCap, ArrowLeft, 
  Settings, ChevronDown, CheckCircle, Clock,
  Edit, Plus, Trash2, Printer, Search, Filter, Download, Edit2, Archive, UserPlus
} from "lucide-react";
import Link from "next/link";
import { TopToolbar } from "@/components/figma-ui/TopToolbar";
import { Button } from "@/components/figma-ui/ui/button";
import { Input } from "@/components/figma-ui/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/figma-ui/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/figma-ui/ui/select";
import { createClient } from "@/utils/supabase/client";
import { Badge } from "@/components/figma-ui/Badge";
import { EditStudentModal } from "@/components/EditStudentModal";

function avatarColors(name: string) {
  const palettes = [
    'from-emerald-100 to-emerald-200 text-emerald-700',
    'from-orange-100 to-orange-200 text-orange-700',
    'from-blue-100 to-blue-200 text-blue-700',
    'from-violet-100 to-violet-200 text-violet-700',
    'from-rose-100 to-rose-200 text-rose-700',
    'from-amber-100 to-amber-200 text-amber-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
}
import { toast } from "sonner"; // Assuming sonner is available or will just use standard alerts if not. We'll use alert for simplicity.

export default function ClassDashboardClient({ 
  classData: initialClassData, 
  enrollments, 
  subjects, 
  teachers, 
  marks 
}: { 
  classData: any; 
  enrollments: any[]; 
  subjects: any[]; 
  teachers: any[]; 
  marks: any[];
}) {
  const [classData, setClassData] = useState(initialClassData);
  const [activeTab, setActiveTab] = useState<"students" | "performance" | "teachers" | "curriculum" | "settings">("students");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const router = useRouter();
  const [formData, setFormData] = useState({ class_name: classData.class_name, section: classData.section, class_teacher_id: classData.class_teacher_id || "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // KPIs
  const totalStudents = enrollments.length;
  const boysCount = enrollments.filter(e => e.student?.gender?.toLowerCase() === 'male' || e.student?.gender?.toLowerCase() === 'm').length;
  const girlsCount = enrollments.filter(e => e.student?.gender?.toLowerCase() === 'female' || e.student?.gender?.toLowerCase() === 'f').length;
  // Remove duplicated subjects (which happen due to secular/theology mixups or bad data)
  const uniqueSubjects = useMemo(() => {
    const seen = new Set();
    return subjects.filter(sub => {
      if (sub.section && sub.section !== classData.section) return false;
      const normalizedName = (sub.subject_name || '').trim().toLowerCase();
      if (seen.has(normalizedName)) {
        return false;
      }
      seen.add(normalizedName);
      return true;
    });
  }, [subjects, classData.section]);

  const totalSubjects = uniqueSubjects.length;

  // Determine actual class teacher from teachers table if not directly assigned via classData
  const assignedClassTeacher = useMemo(() => {
    if (classData.class_teacher) return classData.class_teacher;
    // Fallback: check if any teacher is assigned to this class and has role Class Teacher
    return teachers.find(t => {
      const tClasses = typeof t.classes === 'string' 
        ? t.classes.split(',').map((c: string) => c.trim()) 
        : (t.classes || []);
      return (tClasses.includes(classData.id) || tClasses.includes(classData.class_name)) && t.role === 'Class Teacher';
    });
  }, [classData, teachers]);

  // Find all teachers assigned to this class
  const classTeachersList = useMemo(() => {
    return teachers.filter(t => {
      const tClasses = typeof t.classes === 'string' 
        ? t.classes.split(',').map((c: string) => c.trim()) 
        : (t.classes || []);
      return tClasses.includes(classData.id) || tClasses.includes(classData.class_name);
    });
  }, [classData, teachers]);

  // Calculate Class Average
  const classAverage = useMemo(() => {
    if (!marks || marks.length === 0) return 0;
    // Assuming mot_score and eot_score are out of 100 or need to be summed
    let totalScore = 0;
    let count = 0;
    marks.forEach(m => {
      if (m.eot_score !== null) {
        totalScore += Number(m.eot_score);
        count++;
      } else if (m.mot_score !== null) {
        totalScore += Number(m.mot_score);
        count++;
      }
    });
    return count > 0 ? (totalScore / count).toFixed(1) : 0;
  }, [marks]);

  const handleUpdateClass = async () => {
    setIsSubmitting(true);
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('circular_classes')
        .update({ 
          class_name: formData.class_name, 
          section: formData.section,
          class_teacher_id: formData.class_teacher_id || null
        })
        .eq('id', classData.id)
        .select('*, class_teacher:teachers!class_teacher_id(*)')
        .single();
      
      if (error) throw error;
      if (data) setClassData(data);
      setIsEditModalOpen(false);
      alert("Class updated successfully");
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSectionLabel = (section: string) => {
    const labels: Record<string, string> = {
      nursery: "Nursery",
      lower_primary: "Lower Primary",
      upper_primary: "Upper Primary",
    };
    return labels[section] || section;
  };

  const renderTabs = () => {
    const tabs = [
      { id: "students", label: "Students", icon: <Users className="w-4 h-4" /> },
      { id: "performance", label: "Performance", icon: <CheckCircle className="w-4 h-4" /> },
      { id: "teachers", label: "Teachers", icon: <GraduationCap className="w-4 h-4" /> },
      { id: "curriculum", label: "BookOpen", icon: <BookOpen className="w-4 h-4" /> },
      { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
    ] as const;

    return (
      <div className="flex space-x-1 bg-white/50 p-1 rounded-xl backdrop-blur-md border border-gray-200/50 mb-6 overflow-x-auto w-full md:w-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              activeTab === tab.id 
                ? "bg-white shadow-sm text-[#065F46] font-medium" 
                : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
            }`}
          >
            {tab.icon}
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // Students Tab Logic
  const filteredEnrollments = useMemo(() => {
    if (!searchTerm.trim()) return enrollments;
    const q = searchTerm.toLowerCase();
    return enrollments.filter(e => {
      const name = (e.student?.name || e.student?.full_name || "").toLowerCase();
      const adm = (e.student?.admission_number || "").toLowerCase();
      return name.includes(q) || adm.includes(q);
    });
  }, [enrollments, searchTerm]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Admission Number,Gender,Status\n"
      + filteredEnrollments.map(e => `"${e.student?.name || e.student?.full_name || ''}","${e.student?.admission_number || ''}","${e.student?.gender || ''}","${e.student?.status || ''}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${classData.class_name}_students.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported class list successfully');
  };

  const handleArchive = async (student: any) => {
    if (!student) return;
    const studentName = student.name || student.full_name || 'Student';
    if (!confirm(`Are you sure you want to archive ${studentName}?`)) return;
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to archive student');
      toast.success(`${studentName} has been archived`);
      router.refresh();
    } catch (err) {
      toast.error('Failed to archive student');
    }
  };

  const handleHardDelete = async (student: any) => {
    if (!student) return;
    const studentName = student.name || student.full_name || 'Student';
    if (!confirm(`WARNING: Are you sure you want to PERMANENTLY delete ${studentName}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/students/${student.id}?hard_delete=true`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete student permanently');
      toast.success(`${studentName} has been permanently deleted`);
      router.refresh();
    } catch (err) {
      toast.error('Failed to delete student');
    }
  };

  const renderStudentsTab = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Enrolled Students</h3>
          <p className="text-sm text-gray-500">{totalStudents} students in {classData.class_name}</p>
        </div>
        <Button className="bg-[#065F46] hover:bg-[#065F46]/90 text-white rounded-xl shadow-sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </div>
      
      {/* Search + Actions Bar */}
      <div className="px-6 py-4 bg-slate-50/40 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or ID..."
            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#065F46]/20 focus:border-[#065F46] text-sm transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => toast.info('Advanced filtering for class lists coming soon!')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex-1 sm:flex-none justify-center"
          >
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filters
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex-1 sm:flex-none justify-center"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <th className="p-4 border-b border-gray-100 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
              <th className="p-4 border-b border-gray-100 text-xs font-bold text-slate-500 uppercase tracking-wider">Adm No.</th>
              <th className="p-4 border-b border-gray-100 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="p-4 border-b border-gray-100 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredEnrollments.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  {searchTerm.trim() ? "No students match your search." : "No students currently enrolled in this class."}
                </td>
              </tr>
            ) : (
              filteredEnrollments.map((enrollment) => {
                const studentName = enrollment.student?.name || enrollment.student?.full_name || "Unknown";
                return (
                <tr key={enrollment.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 flex-shrink-0 rounded-2xl bg-gradient-to-br ${avatarColors(studentName)} flex items-center justify-center font-bold shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] text-sm border border-white/50`}>
                        {studentName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 tracking-tight">{studentName}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-medium">
                          {enrollment.student?.gender && (
                            <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold ${
                              enrollment.student.gender.toLowerCase() === 'female' 
                                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {enrollment.student.gender.toLowerCase() === 'female' ? '♀ Female' : '♂ Male'}
                            </span>
                          )}
                          {enrollment.student?.created_at && (
                            <span>Joined {new Date(enrollment.student.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <code className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100/80 px-2 py-1 rounded-md border border-slate-200/60 shadow-sm">
                      {enrollment.student?.admission_number || "N/A"}
                    </code>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <Badge
                        variant={
                          enrollment.student?.status === 'Primary' ? 'emerald' :
                          enrollment.student?.status === 'Theology' ? 'orange' : 'blue'
                        }
                      >
                        {enrollment.student?.status || "Active"}
                      </Badge>
                      {enrollment.student?.is_theology_enrolled && enrollment.student?.status !== 'Theology' && (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-orange-100">
                          + Theology
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingStudent(enrollment.student)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors p-1.5 rounded-lg" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleArchive(enrollment.student)} className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors p-1.5 rounded-lg" title="Archive">
                      <Archive className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleHardDelete(enrollment.student)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors p-1.5 rounded-lg" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )})
            )}
            
            {/* Visual Padding for short lists */}
            {filteredEnrollments.length > 0 && filteredEnrollments.length < 5 && Array.from({length: 5 - filteredEnrollments.length}).map((_, i) => (
              <tr key={`pad-${i}`}>
                <td colSpan={4} className="p-4 border-b border-gray-50 opacity-0 h-[61px]">.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <EditStudentModal 
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        onSaved={() => router.refresh()}
      />
    </div>
  );

  const renderCurriculumTab = () => {
    // Exact theology subjects requested by user
    const theologyKeywords = [
      'quran', 'qur\'an', 'qiraat',
      'lugha', 'lughatul', 'arabic',
      'fiqh',
      'tarbiyah', 'tarbiya',
      'siira', 'seerah',
      'hadith',
      'tawhiid', 'tauheed'
    ];
    
    const secularSubjects = uniqueSubjects.filter(sub => {
      const name = (sub.subject_name || '').toLowerCase();
      return !theologyKeywords.some(keyword => name.includes(keyword));
    });

    const theologySubjects = uniqueSubjects.filter(sub => {
      const name = (sub.subject_name || '').toLowerCase();
      return theologyKeywords.some(keyword => name.includes(keyword));
    });

    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Configured Subjects</h3>
        <p className="text-sm text-gray-500">Subjects assigned to {getSectionLabel(classData.section)}</p>
      </div>
      
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Secular Column */}
        <div>
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
            Secular Curriculum ({secularSubjects.length})
          </h4>
          {secularSubjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {secularSubjects.map((sub) => (
                <div key={sub.id} className="border border-gray-100 p-4 rounded-xl flex items-center space-x-4 bg-gray-50/50 hover:bg-white hover:shadow-sm hover:border-gray-200 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{sub.subject_name}</p>
                    <p className="text-xs text-gray-500">{sub.subject_code || "Core Subject"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
              No secular subjects assigned.
            </p>
          )}
        </div>

        {/* Theology Column */}
        <div>
          <h4 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-4 border-b border-amber-100/50 pb-2">
            Theology Curriculum ({theologySubjects.length})
          </h4>
          {theologySubjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {theologySubjects.map((sub) => (
                <div key={sub.id} className="border border-amber-100/50 p-4 rounded-xl flex items-center space-x-4 bg-amber-50/30 hover:bg-amber-50/80 hover:shadow-sm hover:border-amber-200 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{sub.subject_name}</p>
                    <p className="text-xs text-amber-700/70">{sub.subject_code || "Theology Subject"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
              No theology subjects assigned.
            </p>
          )}
        </div>
      </div>
    </div>
  )};

  const renderTeachersTab = () => (
    <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl overflow-hidden shadow-sm p-6">
      <div className="flex items-center justify-between mb-8">
         <h3 className="text-lg font-bold text-gray-900">Teaching Staff</h3>
      </div>
      
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Class Teacher</h4>
        {assignedClassTeacher ? (
          <div className="flex items-center space-x-4 p-4 border border-[#065F46]/20 bg-[#065F46]/5 rounded-xl max-w-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/40 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-[#065F46]/10 flex items-center justify-center text-[#065F46] font-bold text-lg shrink-0">
              {assignedClassTeacher.name.charAt(0).toUpperCase()}
            </div>
            <div className="relative z-10">
              <p className="font-bold text-gray-900">{assignedClassTeacher.name}</p>
              <p className="text-sm text-[#065F46] font-medium">Primary Class Teacher</p>
            </div>
          </div>
        ) : (
          <div className="p-4 border border-dashed border-gray-300 rounded-xl max-w-md bg-gray-50 flex flex-col items-center justify-center text-center">
            <GraduationCap className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-gray-600 mb-2">No class teacher assigned.</p>
            <Button variant="outline" size="sm" onClick={() => { setActiveTab('settings'); setIsEditModalOpen(true); }} className="rounded-lg text-[#065F46] border-[#065F46]">
              Assign Now
            </Button>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Assigned Teachers ({classTeachersList.length})</h4>
        {classTeachersList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classTeachersList.map(teacher => (
              <div key={teacher.id} className="flex items-center space-x-4 p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                  {teacher.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{teacher.name}</p>
                  <p className="text-xs text-gray-500">{teacher.role || "Teacher"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-4 rounded-xl text-center border border-dashed border-gray-200">No teachers are currently assigned to teach this class.</p>
        )}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl overflow-hidden shadow-sm max-w-3xl">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Class Configuration</h3>
        <p className="text-sm text-gray-500">Update general settings and assignments</p>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Class Name</label>
            <Input 
              value={formData.class_name} 
              onChange={e => setFormData({ ...formData, class_name: e.target.value })} 
              className="rounded-xl border-gray-200 focus-visible:ring-[#065F46]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Section</label>
            <Select value={formData.section} onValueChange={(v) => setFormData({ ...formData, section: v })}>
              <SelectTrigger className="rounded-xl border-gray-200">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nursery">Nursery</SelectItem>
                <SelectItem value="lower_primary">Lower Primary</SelectItem>
                <SelectItem value="upper_primary">Upper Primary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 max-w-md">
          <label className="text-sm font-medium text-gray-700">Assign Class Teacher</label>
          <Select value={formData.class_teacher_id} onValueChange={(v) => setFormData({ ...formData, class_teacher_id: v })}>
            <SelectTrigger className="rounded-xl border-gray-200">
              <SelectValue placeholder="Select a teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">-- None --</SelectItem>
              {teachers.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">Make sure you have run the migration to add class_teacher_id to circular_classes table.</p>
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <Button onClick={handleUpdateClass} disabled={isSubmitting} className="rounded-xl bg-[#065F46] hover:bg-[#047857] text-white">
            {isSubmitting ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-12">
      {/* Premium Shared Topbar */}
      <TopToolbar 
        title={
          <div className="flex items-center gap-2 text-sm">
            <Link href="/admin" className="text-gray-500 hover:text-gray-900">Admin</Link>
            <span className="text-gray-300">/</span>
            <Link href="/admin/classes" className="text-gray-500 hover:text-gray-900">Classes</Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900">{classData.class_name}</span>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Navigation Back */}
        <div className="mb-4">
          <Link href="/admin/classes" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#065F46] transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to all classes
          </Link>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{classData.class_name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border ${
                classData.section === 'nursery' ? 'bg-pink-100 text-pink-800 border-pink-200' :
                classData.section === 'lower_primary' ? 'bg-[#065F46]/10 text-[#065F46] border-[#065F46]/20' :
                'bg-orange-100 text-orange-800 border-orange-200'
              }`}>
                {getSectionLabel(classData.section)}
              </span>
            </div>
            <p className="text-gray-500">Manage students, teachers, and track performance for this class.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl bg-white shadow-sm border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50" onClick={() => { setActiveTab('settings') }}>
              <Edit className="w-4 h-4 mr-2" /> Edit Class
            </Button>
            <Button className="rounded-xl bg-[#065F46] text-white hover:bg-[#047857] shadow-md shadow-[#065F46]/20">
              <Printer className="w-4 h-4 mr-2" /> Print Roster
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Students */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Enrolled</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalStudents}</p>
                <p className="text-xs text-gray-500 mt-2">{boysCount} Boys • {girlsCount} Girls</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Class Average */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#065F46]/5 to-[#065F46]/10 rounded-full blur-2xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Class Average</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{classAverage}%</p>
                <p className="text-xs text-[#065F46] font-medium mt-2">Based on assessments</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#065F46]/10 text-[#065F46] flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Subjects */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-orange-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Subjects Taught</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalSubjects}</p>
                <p className="text-xs text-gray-500 mt-2">Core curriculum</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Class Teacher */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-50 to-purple-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Class Teacher</p>
                <p className="text-lg font-bold text-gray-900 mt-2 truncate w-[150px]">
                  {assignedClassTeacher ? assignedClassTeacher.name : "Not Assigned"}
                </p>
                {assignedClassTeacher ? (
                  <p className="text-xs text-purple-600 font-medium mt-1">Assigned</p>
                ) : (
                  <button onClick={() => { setActiveTab('settings'); setIsEditModalOpen(true); }} className="text-xs text-blue-600 font-medium mt-1 hover:underline">
                    Assign now
                  </button>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Workspace */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          {renderTabs()}
        </div>

        {/* Tab Content Panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "students" && renderStudentsTab()}
            {activeTab === "curriculum" && renderCurriculumTab()}
            {activeTab === "teachers" && renderTeachersTab()}
            {activeTab === "settings" && renderSettingsTab()}
            {activeTab === "performance" && (
              <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-8 text-center text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Detailed Performance Analytics</h3>
                <p>This module is currently being built out. Check back soon for detailed charts and grade distributions.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
