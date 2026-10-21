'use client';

import React, { useState } from 'react';
import { CreateStudentWizard } from '@/components/CreateStudentWizard';
import { StudentRegistrationPrototype } from '@/components/students/StudentRegistrationPrototype';
import { Sparkles, CheckCircle2, FileText, ArrowRight } from 'lucide-react';

export function StudentRegistrationContainer() {
  const [activeTab, setActiveTab] = useState<'current' | 'v2_prototype'>('current');

  return (
    <div className="space-y-4">
      {/* Switcher Header */}
      <div className="bg-white/80 backdrop-blur border border-stone-200/80 rounded-2xl p-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl overflow-x-auto no-scrollbar max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'current'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Current Live Wizard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('v2_prototype')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'v2_prototype'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>V2 Overhaul Prototype</span>
            <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-1.5 py-0.2 rounded uppercase tracking-wider">
              Preview
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-stone-500 pr-2">
          {activeTab === 'v2_prototype' ? (
            <span className="text-emerald-700 font-medium">
              Awaiting Owner Approval Gate · Non-destructive simulation
            </span>
          ) : (
            <span className="text-stone-400">
              Active production registration flow
            </span>
          )}
        </div>
      </div>

      {/* Main Content Pane */}
      {activeTab === 'current' ? (
        <CreateStudentWizard />
      ) : (
        <div className="space-y-4">
          {/* Informational Callout Banner */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-2 text-stone-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Phase D: Proposed Registration Overhaul Highlights</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                docs/STUDENT_REGISTRATION_OVERHAUL_PROPOSAL.md
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-stone-600 pt-1">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span><strong>Core Profile & Age:</strong> DOB calculation auto-recommends class placement.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span><strong>Sibling Detection:</strong> Phone number matching links families instantly.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span><strong>Dual-Curriculum Parity:</strong> Independent Secular & Arabic placements.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span><strong>Real Lifecycle:</strong> Distinct Active, Transferred, Withdrawn, Graduated states.</span>
              </div>
            </div>
          </div>

          <StudentRegistrationPrototype />
        </div>
      )}
    </div>
  );
}
