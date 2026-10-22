"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Save,
  RefreshCw,
  Users,
  Search,
  Check,
  Calendar,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { SignaturePad } from "@/components/teacher/SignaturePad";

export interface StudentAttendance {
  id: string;
  name: string;
  admission_number: string;
  gender: string;
  status: "present" | "absent" | "late" | "excused";
}

export function RollCallClient({
  initialClasses,
  userRole,
}: {
  initialClasses: Array<{ id: string; class_name: string; section?: string }>;
  userRole: string;
}) {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClasses[0]?.id || ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSigPad, setShowSigPad] = useState(false);

  // Load students for the selected class and date
  useEffect(() => {
    if (!selectedClassId) return;
    setLoading(true);
    const supabase = createClient();

    Promise.all([
      // 1. Fetch enrolled students
      supabase
        .from("enrollments")
        .select(`
          id,
          student_id,
          students ( id, name, admission_number, gender )
        `)
        .eq("circular_class_id", selectedClassId)
        .eq("is_active", true),

      // 2. Fetch existing attendance records for date
      supabase
        .from("attendance")
        .select("student_id, status")
        .eq("class_id", selectedClassId)
        .eq("date", selectedDate),
    ])
      .then(([enrollRes, attRes]) => {
        const attMap = new Map<string, "present" | "absent" | "late" | "excused">();
        if (attRes.data) {
          attRes.data.forEach((r: any) => attMap.set(r.student_id, r.status));
        }

        const list: StudentAttendance[] = [];
        if (enrollRes.data) {
          enrollRes.data.forEach((item: any) => {
            const st = Array.isArray(item.students) ? item.students[0] : item.students;
            if (st) {
              list.push({
                id: st.id,
                name: st.name,
                admission_number: st.admission_number || "--",
                gender: st.gender || "unspecified",
                status: attMap.get(st.id) || "present",
              });
            }
          });
        }
        setStudents(list);
      })
      .finally(() => setLoading(false));
  }, [selectedClassId, selectedDate]);

  const updateStatus = (studentId: string, status: "present" | "absent" | "late" | "excused") => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status } : s))
    );
  };

  const markAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: "present" })));
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || null;

      const rows = students.map((s) => ({
        student_id: s.id,
        class_id: selectedClassId,
        date: selectedDate,
        status: s.status,
        recorded_by: userId,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("attendance").upsert(rows, {
        onConflict: "student_id,date",
      });

      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e: any) {
      console.error("Save attendance error:", e);
      alert("Error saving attendance: " + (e.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Counters
  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount = students.filter((s) => s.status === "absent").length;
  const lateCount = students.filter((s) => s.status === "late").length;
  const excusedCount = students.filter((s) => s.status === "excused").length;

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle,rgba(255,255,255,0.08))]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CalendarCheck className="size-3.5" strokeWidth={1.75} />
              Daily Roll Call
            </span>
            <span className="text-xs text-stone-400 font-medium">{userRole}</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--text-primary,#F1F5F9)]">
            Class Attendance & Roster
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Record daily student presence. Records sync automatically with report card attendance metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSigPad((p) => !p)}
            className="h-9 px-3.5 rounded-xl border border-white/10 bg-[var(--bg-card,#111714)] hover:border-emerald-500/40 text-xs font-bold text-stone-200 transition cursor-pointer"
          >
            {showSigPad ? "Hide Signature Pad" : "Teacher Signature"}
          </button>
          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={isSaving || students.length === 0}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 text-black font-extrabold text-xs flex items-center gap-2 hover:brightness-105 active:scale-95 transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="size-3.5" strokeWidth={3} />
            ) : (
              <Save className="size-3.5" strokeWidth={2} />
            )}
            <span>{saveSuccess ? "Attendance Saved!" : "Save Roll Call"}</span>
          </button>
        </div>
      </div>

      {/* Signature Pad Accordion */}
      {showSigPad && (
        <div className="max-w-2xl">
          <SignaturePad
            role={userRole}
            slotKey="class-teacher"
            label="Class Teacher Signature"
          />
        </div>
      )}

      {/* Class Selector & Date Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[var(--bg-card,#111714)] border border-[var(--border-subtle,rgba(255,255,255,0.08))]">
        <div>
          <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
            Class Cohort
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-xs outline-none focus:border-emerald-400"
          >
            {initialClasses.map((c) => (
              <option key={c.id} value={c.id} className="bg-stone-900 text-white">
                {c.class_name} {c.section ? `(${c.section})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
            Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
            Search Pupil
          </label>
          <div className="relative">
            <Search className="size-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name or ADM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Attendance Summary Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Present</span>
            <div className="text-xl font-black text-emerald-300 tabular-nums">{presentCount}</div>
          </div>
          <CheckCircle2 className="size-5 text-emerald-400" />
        </div>

        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Absent</span>
            <div className="text-xl font-black text-rose-300 tabular-nums">{absentCount}</div>
          </div>
          <XCircle className="size-5 text-rose-400" />
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Late</span>
            <div className="text-xl font-black text-amber-300 tabular-nums">{lateCount}</div>
          </div>
          <Clock className="size-5 text-amber-400" />
        </div>

        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Excused</span>
            <div className="text-xl font-black text-sky-300 tabular-nums">{excusedCount}</div>
          </div>
          <AlertCircle className="size-5 text-sky-400" />
        </div>
      </div>

      {/* Roster & Quick Actions */}
      <div className="rounded-2xl border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--bg-card,#111714)] overflow-hidden shadow-xs">
        <div className="p-3.5 sm:p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-emerald-400" />
            <span className="font-bold text-white text-xs">
              Class Roster ({filteredStudents.length} Students)
            </span>
          </div>

          <button
            type="button"
            onClick={markAllPresent}
            className="h-7 px-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-black font-extrabold text-[11px] transition cursor-pointer"
          >
            Mark All Present
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Student Name</th>
                <th className="py-2.5 px-4">ADM No.</th>
                <th className="py-2.5 px-4">Gender</th>
                <th className="py-2.5 px-4 text-center">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    <RefreshCw className="size-4 animate-spin inline mr-2 text-emerald-400" />
                    Loading class roster...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    No enrolled students in this class.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono text-stone-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-white">{st.name}</td>
                    <td className="py-3 px-4 font-mono text-stone-400">{st.admission_number}</td>
                    <td className="py-3 px-4 capitalize text-stone-400">{st.gender}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateStatus(st.id, "present")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            st.status === "present"
                              ? "bg-emerald-500 text-black shadow-xs"
                              : "bg-white/5 text-stone-400 hover:text-white"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(st.id, "absent")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            st.status === "absent"
                              ? "bg-rose-500 text-white shadow-xs"
                              : "bg-white/5 text-stone-400 hover:text-white"
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(st.id, "late")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            st.status === "late"
                              ? "bg-amber-500 text-black shadow-xs"
                              : "bg-white/5 text-stone-400 hover:text-white"
                          }`}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(st.id, "excused")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            st.status === "excused"
                              ? "bg-sky-500 text-white shadow-xs"
                              : "bg-white/5 text-stone-400 hover:text-white"
                          }`}
                        >
                          Excused
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
