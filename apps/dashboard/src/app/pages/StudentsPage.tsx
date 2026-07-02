import { useState } from "react";
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
} from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { PageState } from "@/components/PageState";
import { HeroSection } from "@/components/HeroSection";
import { api } from "@/services/api/client";
import { ENDPOINTS } from "@/services/api/endpoints";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { studentFormSchema, type StudentForm } from "@/lib/validation";

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { students, loading, error, refetch } = useStudents(searchTerm);
  const { classes } = useClasses();
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selected, setSelected] = useState<string[]>([]);
  const [viewStudent, setViewStudent] = useState<
    (typeof students)[number] | null
  >(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [theologyClasses, setTheologyClasses] = useState<{ id: string; class_name_english: string }[]>([]);
  const [adding, setAdding] = useState(false);

  const studentForm = useForm<StudentForm>({
    resolver: zodResolver(studentFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      admissionNumber: "",
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
    formState: { errors },
  } = studentForm;

  const watchedClassId = watch("classId");
  const selectedClassRow = classes.find((c) => c.id === watchedClassId);
  const isP7 = selectedClassRow?.name === "P.7";

  const openAddModal = async () => {
    setShowAddModal(true);
    if (classes.length && !studentForm.getValues("classId")) {
      setValue("classId", classes[0].id);
    }
    try {
      const res = await api.get<{ data: { id: string; class_name_english: string }[] }>(ENDPOINTS.theologyClasses);
      setTheologyClasses(res.data ?? []);
    } catch {
      setTheologyClasses([]);
    }
  };

  const handleAddStudent = handleSubmit(async (values) => {
    if (!isP7 && !values.theologyClassId) {
      toast.error("Theology class is required for non-P.7 students");
      return;
    }

    setAdding(true);
    try {
      await api.post(ENDPOINTS.students, {
        name: values.name.trim(),
        admission_number: values.admissionNumber.trim(),
        circular_class_id: values.classId,
        theology_class_id: isP7 ? null : values.theologyClassId ?? null,
        academic_year: values.academicYear,
      });
      toast.success("Student added successfully");
      setShowAddModal(false);
      reset();
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setAdding(false);
    }
  });

  const filtered = (students ?? []).filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchClass =
      selectedClass === "All Classes" || s.class === selectedClass;

    const matchStatus =
      selectedStatus === "All" ||
      s.status === selectedStatus.toLowerCase();

    return matchSearch && matchClass && matchStatus;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelected(
      selected.length === filtered.length
        ? []
        : filtered.map((s) => s.id)
    );
  };

  return (
    <div>
      <HeroSection
        title="Students"
        subtitle={`${students.length} total students enrolled`}
        actions={
          <>
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
              style={{
                border: "1px solid #E5E7EB",
                color: "#374151",
                fontSize: "13px",
                fontWeight: 600,
                background: "white",
              }}
              onClick={() => toast.success("Exporting student data...")}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => void openAddModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
              style={{
                background: "#10B981",
                color: "white",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-64">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "#9CA3AF" }}
          />

          <input
            placeholder="Search students by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none"
            style={{
              border: "1px solid #E5E7EB",
              background: "white",
              fontSize: "13.5px",
              color: "#374151",
            }}
          />
        </div>

        <div className="relative">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="pl-3 pr-8 py-2.5 rounded-xl border appearance-none cursor-pointer"
            style={{
              border: "1px solid #E5E7EB",
              background: "white",
              fontSize: "13.5px",
              color: "#374151",
              fontWeight: 500,
            }}
          >
            <option>All Classes</option>

            {classes.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>

          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "#6B7280" }}
          />
        </div>

        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="pl-3 pr-8 py-2.5 rounded-xl border appearance-none cursor-pointer"
            style={{
              border: "1px solid #E5E7EB",
              background: "white",
              fontSize: "13.5px",
              color: "#374151",
              fontWeight: 500,
            }}
          >
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>

          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "#6B7280" }}
          />
        </div>

        {selected.length > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color: "#065F46",
                fontWeight: 600,
              }}
            >
              {selected.length} selected
            </span>

            <button
              className="text-red-500 hover:text-red-600 ml-2"
              style={{ fontSize: "12px" }}
              onClick={() =>
                toast.error("Delete selected?")
              }
            >
              Delete
            </button>

            <button
              className="text-blue-500 hover:text-blue-600"
              style={{ fontSize: "12px" }}
              onClick={() =>
                toast.success("Exporting selected...")
              }
            >
              Export
            </button>
          </div>
        )}
      </div>

      <PageState loading={loading} error={error} onRetry={refetch} empty={!loading && !error && filtered.length === 0} emptyTitle="No students" emptyMessage="No students match your filters.">
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "white",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(0,0,0,0.07)",
                  background: "#FAFAFA",
                }}
              >
                <th
                  className="pl-5 py-3 text-left"
                  style={{ width: "40px" }}
                >
                  <input
                    type="checkbox"
                    checked={
                      selected.length === filtered.length &&
                      filtered.length > 0
                    }
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>

                {[
                  "Student",
                  "Class",
                  "Guardian",
                  "Attendance",
                  "Avg Score",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#9CA3AF",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center"
                  >
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-emerald-500 opacity-50" />
                      </div>

                      <h3 className="text-gray-900 font-semibold mb-1">
                        No students found
                      </h3>

                      <p className="text-gray-500 text-sm mb-4 text-center">
                        We couldn't find any students matching
                        your current search and filter criteria.
                      </p>

                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedClass("All Classes");
                          setSelectedStatus("All");
                        }}
                        className="text-emerald-600 font-medium text-sm hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((student, i) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: Math.min(i * 0.05, 0.5),
                    }}
                    style={{
                      borderBottom:
                        i < filtered.length - 1
                          ? "1px solid rgba(0,0,0,0.04)"
                          : "none",
                    }}
                    className="hover:bg-emerald-50/50 transition-colors"
                  >
                    <td className="pl-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.includes(student.id)}
                        onChange={() =>
                          toggleSelect(student.id)
                        }
                        className="rounded"
                      />
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `hsl(${
                              (student.id.charCodeAt(3) *
                                37) %
                              360
                            }, 60%, 90%)`,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: `hsl(${
                                (student.id.charCodeAt(3) *
                                  37) %
                                360
                              }, 60%, 35%)`,
                            }}
                          >
                            {student.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                        </div>

                        <div>
                          <p
                            style={{
                              fontSize: "13.5px",
                              fontWeight: 600,
                              color: "#374151",
                            }}
                          >
                            {student.name}
                          </p>

                          <p
                            style={{
                              fontSize: "11px",
                              color: "#9CA3AF",
                            }}
                          >
                            {student.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className="px-2.5 py-1 rounded-lg"
                        style={{
                          background:
                            "rgba(16,185,129,0.08)",
                          color: "#065F46",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {student.class}
                      </span>
                    </td>

                    <td
                      className="px-4 py-3.5 text-sm"
                      style={{ color: "#6B7280" }}
                    >
                      {student.guardian}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-16 h-1.5 rounded-full overflow-hidden"
                          style={{ background: "#F3F4F6" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${student.attendance ?? 0}%`,
                              background:
                                (student.attendance ?? 0) >= 90
                                  ? "#10B981"
                                  : (student.attendance ?? 0) >= 75
                                  ? "#F59E0B"
                                  : "#EF4444",
                            }}
                          />
                        </div>

                        <span
                          style={{
                            fontSize: "12px",
                            color: "#6B7280",
                          }}
                        >
                          {student.attendance ?? 0}%
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color:
                            (student.avgScore ?? 0) >= 80
                              ? "#10B981"
                              : (student.avgScore ?? 0) >= 60
                              ? "#F59E0B"
                              : "#EF4444",
                        }}
                      >
                        {student.avgScore ?? 0}%
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit"
                        style={{
                          background:
                            student.status === "active"
                              ? "rgba(16,185,129,0.1)"
                              : "rgba(239,68,68,0.1)",
                          color:
                            student.status === "active"
                              ? "#065F46"
                              : "#EF4444",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background:
                              student.status === "active"
                                ? "#10B981"
                                : "#EF4444",
                          }}
                        />

                        {student.status === "active"
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setViewStudent(student)
                          }
                          className="p-1.5 rounded-lg hover:bg-emerald-50"
                          title="View"
                        >
                          <Eye
                            className="w-4 h-4"
                            style={{ color: "#10B981" }}
                          />
                        </button>

                        <button
                          className="p-1.5 rounded-lg hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit
                            className="w-4 h-4"
                            style={{ color: "#6366F1" }}
                          />
                        </button>

                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2
                            className="w-4 h-4"
                            style={{ color: "#EF4444" }}
                          />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            borderTop: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <p style={{ fontSize: "13px", color: "#6B7280" }}>
            Showing {filtered.length} of {students.length} students
          </p>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background:
                    p === 1 ? "#10B981" : "white",
                  color:
                    p === 1 ? "white" : "#374151",
                  fontSize: "13px",
                  fontWeight: 600,
                  border:
                    p !== 1
                      ? "1px solid #E5E7EB"
                      : "none",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      </PageState>

      {/* Modals */}
      <AnimatePresence>
        {/* Student Profile Modal */}
        {viewStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setViewStudent(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
              }}
              className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: "white" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between p-6"
                style={{
                  background:
                    "linear-gradient(135deg, #065F46, #047857)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background:
                        "rgba(255,255,255,0.2)",
                    }}
                  >
                    <span className="text-white text-xl font-bold">
                      {viewStudent.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                  </div>

                  <div>
                    <h2
                      className="text-white font-bold"
                      style={{ fontSize: "18px" }}
                    >
                      {viewStudent.name}
                    </h2>

                    <p
                      style={{
                        color:
                          "rgba(255,255,255,0.7)",
                        fontSize: "13px",
                      }}
                    >
                      {viewStudent.id} ·{" "}
                      {viewStudent.class}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setViewStudent(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full"
                  style={{
                    background:
                      "rgba(255,255,255,0.2)",
                  }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-6">
                {[
                  {
                    label: "Full Name",
                    value: viewStudent.name,
                  },
                  {
                    label: "Student ID",
                    value: viewStudent.id,
                  },
                  {
                    label: "Class",
                    value: viewStudent.class,
                  },
                  {
                    label: "Age",
                    value: `${viewStudent.age} years`,
                  },
                  {
                    label: "Gender",
                    value: viewStudent.gender,
                  },
                  {
                    label: "Guardian",
                    value: viewStudent.guardian,
                  },
                  {
                    label: "Phone",
                    value: viewStudent.phone,
                  },
                  {
                    label: "Enrolled",
                    value: viewStudent.enrolled,
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#9CA3AF",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {label}
                    </p>

                    <p
                      style={{
                        fontSize: "14px",
                        color: "#374151",
                        fontWeight: 500,
                        marginTop: "2px",
                      }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background:
                        "rgba(16,185,129,0.07)",
                      border:
                        "1px solid rgba(16,185,129,0.15)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6B7280",
                      }}
                    >
                      Attendance Rate
                    </p>

                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: 700,
                        color: "#10B981",
                      }}
                    >
                      {viewStudent.attendance}%
                    </p>
                  </div>

                  <div
                    className="rounded-xl p-4"
                    style={{
                      background:
                        "rgba(245,158,11,0.07)",
                      border:
                        "1px solid rgba(245,158,11,0.15)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6B7280",
                      }}
                    >
                      Average Score
                    </p>

                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: 700,
                        color: "#F59E0B",
                      }}
                    >
                      {viewStudent.avgScore}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  className="flex-1 py-2.5 rounded-xl font-semibold hover:opacity-90"
                  style={{
                    background: "#10B981",
                    color: "white",
                    fontSize: "13px",
                  }}
                >
                  Generate Report
                </button>

                <button
                  className="flex-1 py-2.5 rounded-xl font-semibold hover:bg-gray-50"
                  style={{
                    border: "1px solid #E5E7EB",
                    color: "#374151",
                    fontSize: "13px",
                  }}
                  onClick={() => setViewStudent(null)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Add Student Modal */}
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl overflow-hidden"
              style={{ background: "white" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between p-6 border-b"
                style={{
                  borderColor: "rgba(0,0,0,0.07)",
                }}
              >
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#374151",
                  }}
                >
                  Add New Student
                </h2>

                <button
                  onClick={() => {
                    setShowAddModal(false);
                    reset();
                  }}
                >
                  <X
                    className="w-5 h-5"
                    style={{ color: "#9CA3AF" }}
                  />
                </button>
              </div>

              <motion.div className="p-6 space-y-4">
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Student's full name"
                    {...register("name")}
                    className="w-full px-4 py-2.5 rounded-xl outline-none"
                    style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px" }}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>
                    Admission Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JIS-2026-001"
                    {...register("admissionNumber")}
                    className="w-full px-4 py-2.5 rounded-xl outline-none"
                    style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px" }}
                  />
                  {errors.admissionNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.admissionNumber.message}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>
                    Circular Class
                  </label>
                  <select
                    {...register("classId")}
                    className="w-full px-4 py-2.5 rounded-xl outline-none appearance-none"
                    style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px" }}
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.classId && (
                    <p className="mt-1 text-sm text-red-600">{errors.classId.message}</p>
                  )}
                </div>
                {!isP7 && (
                  <div>
                    <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>
                      Theology Class
                    </label>
                    <select
                      {...register("theologyClassId")}
                      className="w-full px-4 py-2.5 rounded-xl outline-none appearance-none"
                      style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px" }}
                    >
                      <option value="">Select theology class</option>
                      {theologyClasses.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.class_name_english}
                        </option>
                      ))}
                    </select>
                    {errors.theologyClassId && (
                      <p className="mt-1 text-sm text-red-600">{errors.theologyClassId.message}</p>
                    )}
                  </div>
                )}
              </motion.div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  className="flex-1 py-2.5 rounded-xl font-semibold hover:opacity-90"
                  style={{
                    background: "#10B981",
                    color: "white",
                    fontSize: "13px",
                  }}
                  disabled={adding}
                  onClick={() => void handleAddStudent()}
                >
                  {adding ? "Adding…" : "Add Student"}
                </button>

                <button
                  className="flex-1 py-2.5 rounded-xl font-semibold hover:bg-gray-50"
                  style={{
                    border: "1px solid #E5E7EB",
                    color: "#374151",
                    fontSize: "13px",
                  }}
                  onClick={() => {
                    setShowAddModal(false);
                    reset();
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}