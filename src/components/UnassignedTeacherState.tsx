"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, BookOpen, Layers } from "lucide-react";

export interface UnassignedTeacherStateProps {
  moduleName?: string;
  department?: "secular" | "theology" | "both";
  roleLabel?: string;
  description?: string;
}

export function UnassignedTeacherState({
  moduleName = "Academic Workspace",
  department = "both",
  roleLabel = "Teacher",
  description,
}: UnassignedTeacherStateProps) {
  const deptLabel =
    department === "theology"
      ? "Theology (Islamic Studies)"
      : department === "secular"
        ? "Secular Studies"
        : "Secular & Theology";

  return (
    <div
      data-testid="unassigned-teacher-state"
      className="w-full max-w-2xl mx-auto my-8 rounded-2xl border border-[#E7E2D7] bg-white p-6 sm:p-8 shadow-sm"
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF7F2] border border-[#E7E2D7] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-3">
          {roleLabel} • {deptLabel}
        </span>

        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
          No Classes or Subjects Assigned Yet
        </h2>

        <p className="mt-2 text-sm text-stone-600 max-w-lg leading-relaxed">
          {description ||
            `Your staff account is active, but no class cohorts or subject pairs have been assigned to your profile for ${moduleName} in the active academic term.`}
        </p>

        <div className="mt-6 w-full rounded-xl bg-[#FAF7F2] border border-[#E7E2D7] p-4 text-left space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-700">
            What Needs to Be Configured by the Administrator or DOS
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-start gap-2.5 rounded-lg bg-white p-3 border border-[#E7E2D7]">
              <Layers className="w-4 h-4 text-[#0D5C3A] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-stone-900">Class Cohort Assignment</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Link your account as a Homeroom Class Teacher or assign specific class streams in Teachers &amp; Staff.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-white p-3 border border-[#E7E2D7]">
              <BookOpen className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-stone-900">Department &amp; Subject Pair</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Confirm your department track ({deptLabel}) and assigned subject specialization.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0D5C3A] hover:bg-[#0A472C] px-4 py-2.5 min-h-[40px] text-xs font-semibold text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

