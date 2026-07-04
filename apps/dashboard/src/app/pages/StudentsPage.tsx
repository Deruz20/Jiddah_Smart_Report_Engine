import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Search,
  Plus,
  Download,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  X,
  Users,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  MoonStar
} from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { PageState } from "@/components/PageState";
import { HeroSection } from "@/components/HeroSection";
import { api } from "@/services/api/client";
import { ENDPOINTS } from "@/services/api/endpoints";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { studentFormSchema, type StudentForm } from "@/lib/validation";

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { students, loading, error, refetch } = useStudents(searchTerm);
  const { classes } = useClasses();
  const [selectedClassFilter, setSelectedClassFilter] = useState("All Classes");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selected, setSelected] = useState<string[]>([]);
  const [viewStudent, setViewStudent] = useState<(typeof students)[number] | null>(null);
  
  // Modal & Stepper State
  const [showAddModal, setShowAddModal] = useState(false);
  const [step, setStep] = useState(1);
  const [theologyClasses, setTheologyClasses] = useState<{ id: string; class_name_english: string; class_name_arabic: string }[]>([]);
  const [adding, setAdding] = useState(false);

  const studentForm = useForm<StudentForm>({
    resolver: zodResolver(studentFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      arabicName: "",
      admissionNumber: "",
      isMuslim: true,
      classId: "",
      theologyClassId: undefined,
      academicYear: new Date().getFullYear(),
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = studentForm;

  const watchedIsMuslim = watch("isMuslim");
  const watchedClassId = watch("classId");
  const selectedClassRow = classes.find((c) => c.id === watchedClassId);
  const isP7 = selectedClassRow?.name === "P.7";

  const openAddModal = async () => {
    setShowAddModal(true);
    setStep(1);
    
    // Auto-generate admission number
    const randomId = Math.floor(Math.random() * 900) + 100;
    setValue("admissionNumber", `JINPS-2026-${randomId}`);
    
    if (classes.length && !studentForm.getValues("classId")) {
      setValue("classId", classes[0].id);
    }
    try {
      const res = await api.get<{ data: { id: string; class_name_english: string; class_name_arabic: string }[] }>(ENDPOINTS.theologyClasses);
      setTheologyClasses(res.data ?? []);
    } catch {
      setTheologyClasses([]);
    }
  };

  const handleNextStep = async () => {
    const isValid = await trigger(["name", "admissionNumber", "arabicName"]);
    if (isValid) {
      setStep(2);
    }
  };

  const handleAddStudent = handleSubmit(async (values) => {
    if (values.isMuslim && !isP7 && !values.theologyClassId) {
      toast.error("Theology class is required for Muslim non-P.7 students");
      return;
    }

    setAdding(true);
    try {
      await api.post(ENDPOINTS.students, {
        name: values.name.trim(),
        name_arabic: values.arabicName?.trim(),
        admission_number: values.admissionNumber.trim(),
        is_muslim: values.isMuslim,
        circular_class_id: values.classId,
        theology_class_id: (values.isMuslim && !isP7) ? (values.theologyClassId ?? null) : null,
        academic_year: values.academicYear,
      });
      toast.success("Student added successfully");
      setShowAddModal(false);
      reset();
      setStep(1);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setAdding(false);
    }
  });

  const filtered = (students ?? []).filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClassFilter === "All Classes" || s.class === selectedClassFilter;
    const matchStatus = selectedStatus === "All" || s.status === selectedStatus.toLowerCase();
    return matchSearch && matchClass && matchStatus;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    setSelected(selected.length === filtered.length ? [] : filtered.map((s) => s.id));
  };

  return (
    <div>
      <HeroSection
        title="Students"
        subtitle={`${students.length} total students enrolled`}
        actions={
          <>
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-sm"
              style={{ border: "1px solid #E5E7EB", color: "#374151", fontSize: "13px", fontWeight: 600, background: "white" }}
              onClick={() => toast.success("Exporting student data...")}
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => void openAddModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-emerald-200"
              style={{ background: "#10B981", color: "white", fontSize: "13px", fontWeight: 600 }}
            >
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search students by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none shadow-sm"
            style={{ border: "1px solid #E5E7EB", background: "white", fontSize: "13.5px", color: "#374151" }}
          />
        </div>

        <div className="relative shadow-sm rounded-xl">
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="pl-3 pr-8 py-2.5 rounded-xl border appearance-none cursor-pointer outline-none"
            style={{ border: "1px solid #E5E7EB", background: "white", fontSize: "13.5px", color: "#374151", fontWeight: 500 }}
          >
            <option>All Classes</option>
            {classes.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-slate-500" />
        </div>
      </div>

      <PageState loading={loading} error={error} onRetry={refetch} empty={!loading && !error && filtered.length === 0} emptyTitle="No students" emptyMessage="No students match your filters.">
        <div className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="pl-5 py-3 text-left w-10">
                    <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                  </th>
                  {["Student", "Class", "Guardian", "Attendance", "Avg Score", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((student, i) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(i * 0.05, 0.5) }}
                    className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <td className="pl-5 py-3.5"><input type="checkbox" checked={selected.includes(student.id)} onChange={() => toggleSelect(student.id)} className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `hsl(${(student.id.charCodeAt(3) * 37) % 360}, 60%, 90%)` }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: `hsl(${(student.id.charCodeAt(3) * 37) % 360}, 60%, 35%)` }}>
                            {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-800">{student.name}</p>
                          <p className="text-[11px] text-slate-400">{student.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">{student.class}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-slate-500">{student.guardian}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${student.attendance ?? 0}%`, background: (student.attendance ?? 0) >= 90 ? "#10B981" : (student.attendance ?? 0) >= 75 ? "#F59E0B" : "#EF4444" }} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">{student.attendance ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span style={{ fontSize: "13px", fontWeight: 700, color: (student.avgScore ?? 0) >= 80 ? "#10B981" : (student.avgScore ?? 0) >= 60 ? "#F59E0B" : "#EF4444" }}>
                        {student.avgScore ?? 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md w-fit text-[11px] font-bold border ${student.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${student.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {student.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewStudent(student)} className="p-1.5 rounded-md hover:bg-slate-100 transition-colors" title="View"><Eye className="w-4 h-4 text-slate-500" /></button>
                        <button className="p-1.5 rounded-md hover:bg-slate-100 transition-colors" title="Edit"><Edit className="w-4 h-4 text-slate-500" /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageState>

      {/* Add Student Modal (Stepper with Framer Motion) */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-xl bg-white rounded-[24px] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Enroll Student</h2>
                  <p className="text-[13px] font-semibold text-slate-400 mt-0.5">Step {step} of 2</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 min-h-[300px]">
                <form id="add-student-form" onSubmit={handleAddStudent} className="space-y-6">
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-5">
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Student Full Name</label>
                          <input 
                            {...register("name", {
                              onChange: (e) => {
                                e.target.value = e.target.value.toUpperCase();
                              }
                            })} 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-[14px]" 
                            placeholder="Enter full name" 
                          />
                          {errors.name && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{errors.name.message}</p>}
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Arabic Name (Optional)</label>
                          <input 
                            {...register("arabicName")} 
                            dir="rtl"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-[14px] text-right font-arabic" 
                            placeholder="الاسم بالعربية" 
                          />
                          {errors.arabicName && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{errors.arabicName.message}</p>}
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Admission Number</label>
                          <input {...register("admissionNumber")} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-[14px]" placeholder="e.g. JID/2026/001" />
                          {errors.admissionNumber && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{errors.admissionNumber.message}</p>}
                        </div>
                        
                        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                              <MoonStar className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-[14px]">Islamic Theology</p>
                              <p className="text-[12px] font-medium text-slate-500 mt-0.5">Enable if the student takes Theology</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" {...register("isMuslim")} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 shadow-inner"></div>
                          </label>
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Circular Class</label>
                            <select {...register("classId")} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-[14px] transition-all">
                              {classes.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            {errors.classId && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{errors.classId.message}</p>}
                          </div>
                          
                          <AnimatePresence mode="popLayout">
                            {watchedIsMuslim ? (
                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="origin-top">
                                <label className="block text-[13px] font-bold text-indigo-700 mb-1.5">Theology Level</label>
                                {isP7 ? (
                                  <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-[13px] font-semibold flex items-center justify-center">
                                    Not Applicable for P.7
                                  </div>
                                ) : (
                                  <select {...register("theologyClassId")} className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-[14px] text-indigo-900 transition-all">
                                    <option value="">Select Level</option>
                                    {theologyClasses.map((c) => (
                                      <option key={c.id} value={c.id}>{c.class_name_english} ({c.class_name_arabic})</option>
                                    ))}
                                  </select>
                                )}
                              </motion.div>
                            ) : (
                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="origin-top">
                                <label className="block text-[13px] font-bold text-slate-400 mb-1.5">Theology Level</label>
                                <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100/50 text-slate-400 text-[13px] font-semibold flex items-center justify-center">
                                  Disabled (Non-Muslim)
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Academic Year</label>
                          <input type="number" {...register("academicYear", { valueAsNumber: true })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-[14px]" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </div>

              <div className="p-5 border-t border-slate-100 flex justify-between bg-slate-50">
                {step === 2 ? (
                  <button type="button" onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl font-bold text-[13px] text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                ) : (
                  <div />
                )}
                
                {step === 1 ? (
                  <button type="button" onClick={handleNextStep} className="px-6 py-2.5 rounded-xl font-bold text-[13px] bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="submit" form="add-student-form" disabled={adding} className="px-6 py-2.5 rounded-xl font-bold text-[13px] bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-200 disabled:opacity-50">
                    {adding ? "Enrolling..." : "Complete Enrollment"} <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}