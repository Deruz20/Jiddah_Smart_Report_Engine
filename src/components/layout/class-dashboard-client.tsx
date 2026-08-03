"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, BookOpen, GraduationCap, ArrowLeft, 
  Settings, ChevronDown, CheckCircle, Clock,
  Edit, Plus, Trash2, Printer
} from "lucide-react";
import Link from "next/link";
import { TopToolbar } from "@/components/figma-ui/TopToolbar";
import { Button } from "@/components/figma-ui/ui/button";
import { Input } from "@/components/figma-ui/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/figma-ui/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/figma-ui/ui/select";
import { createClient } from "@/utils/supabase/client";
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
  const [formData, setFormData] = useState({ class_name: classData.class_name, section: classData.section, class_teacher_id: classData.class_teacher_id || "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // KPIs
  const totalStudents = enrollments.length;
  const boysCount = enrollments.filter(e => e.student?.gender === 'Male' || e.student?.gender === 'M').length;
  const girlsCount = enrollments.filter(e => e.student?.gender === 'Female' || e.student?.gender === 'F').length;
  const totalSubjects = subjects.length; // Actually should filter by section if applicable

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
      { id: "curriculum", label: "Curriculum", icon: <BookOpen className="w-4 h-4" /> },
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

  const renderStudentsTab = () => (
    <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Enrolled Students ({totalStudents})</h3>
        <Button className="bg-[#065F46] hover:bg-[#047857] text-white rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Add Student
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <th className="p-4 border-b border-gray-100">Adm No.</th>
              <th className="p-4 border-b border-gray-100">Student Name</th>
              <th className="p-4 border-b border-gray-100">Gender</th>
              <th className="p-4 border-b border-gray-100">Status</th>
              <th className="p-4 border-b border-gray-100 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {enrollments.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  No students currently enrolled in this class.
                </td>
              </tr>
            ) : (
              enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4 text-sm font-medium text-gray-900">
                    {enrollment.student?.admission_number || "N/A"}
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-bold text-gray-900">{enrollment.student?.full_name}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {enrollment.student?.gender}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#065F46] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
            
            {/* Visual Padding for short lists */}
            {enrollments.length > 0 && enrollments.length < 5 && Array.from({length: 5 - enrollments.length}).map((_, i) => (
              <tr key={`pad-${i}`}>
                <td colSpan={5} className="p-4 border-b border-gray-50 opacity-0 h-[61px]">.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCurriculumTab = () => (
    <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Configured Subjects</h3>
        <p className="text-sm text-gray-500">Subjects assigned to {getSectionLabel(classData.section)}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {subjects.map((sub) => (
          <div key={sub.id} className="border border-gray-100 p-4 rounded-xl flex items-center space-x-4 bg-gray-50/50 hover:bg-white hover:shadow-sm hover:border-gray-200 transition-all">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900">{sub.subject_name}</p>
              <p className="text-xs text-gray-500">{sub.subject_code || "Core Subject"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTeachersTab = () => (
    <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl overflow-hidden shadow-sm p-6">
      <div className="flex items-center justify-between mb-8">
         <h3 className="text-lg font-bold text-gray-900">Teaching Staff</h3>
      </div>
      
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Class Teacher</h4>
        {classData.class_teacher ? (
          <div className="flex items-center space-x-4 p-4 border border-[#065F46]/20 bg-[#065F46]/5 rounded-xl max-w-md">
            <div className="w-12 h-12 rounded-full bg-[#065F46]/10 flex items-center justify-center text-[#065F46] font-bold text-lg">
              {classData.class_teacher.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-gray-900">{classData.class_teacher.name}</p>
              <p className="text-sm text-[#065F46]">Primary Class Teacher</p>
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
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Subject Teachers (Mock)</h4>
        <p className="text-sm text-gray-500 mb-4">Subject assignment mapping feature is coming soon.</p>
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
                  {classData.class_teacher ? classData.class_teacher.name : "Not Assigned"}
                </p>
                {classData.class_teacher ? (
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
