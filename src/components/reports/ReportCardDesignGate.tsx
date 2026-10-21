'use client';

import React, { useState } from 'react';
import { Layout, Check, Sparkles, BookOpen, Shield, Printer, ExternalLink } from 'lucide-react';
import { SchoolStamp } from './SchoolStamp';

export type ReportLayoutProposalId = 'traditional' | 'modern-academy' | 'compact-executive';

interface ReportCardDesignGateProps {
  currentSelection?: ReportLayoutProposalId;
  onSelectLayout?: (layoutId: ReportLayoutProposalId) => void;
  isStandalone?: boolean;
}

export const ReportCardDesignGate: React.FC<ReportCardDesignGateProps> = ({
  currentSelection = 'modern-academy',
  onSelectLayout,
  isStandalone = false,
}) => {
  const [selectedLayout, setSelectedLayout] = useState<ReportLayoutProposalId>(currentSelection);

  const handleSelect = (id: ReportLayoutProposalId) => {
    setSelectedLayout(id);
    if (onSelectLayout) {
      onSelectLayout(id);
    }
  };

  return (
    <div className={`space-y-6 ${isStandalone ? 'p-6 bg-white rounded-2xl border border-stone-200 shadow-sm' : ''}`}>
      {/* Header */}
      <div className="border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2">
          <Layout className="w-5 h-5 text-emerald-700" />
          <h3 className="text-base font-bold text-stone-900">A4 Report-Card Design Gate (3 Divergent Layout Proposals)</h3>
          <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
            Awaiting Owner Direction Selection
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Per safety protocol: <strong>Do not restyle production templates yet.</strong> Review the 3 divergent brandable layout directions below and select the governing aesthetic for report cards.
        </p>
      </div>

      {/* 3 Proposal Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Proposal 1 */}
        <div
          onClick={() => handleSelect('traditional')}
          className={`cursor-pointer rounded-xl p-4 border-2 transition-all relative ${
            selectedLayout === 'traditional'
              ? 'border-stone-900 bg-stone-50 shadow-md ring-1 ring-stone-900'
              : 'border-stone-200 bg-white hover:border-stone-400'
          }`}
        >
          {selectedLayout === 'traditional' && (
            <span className="absolute top-3 right-3 bg-stone-900 text-white rounded-full p-0.5">
              <Check className="w-3.5 h-3.5" />
            </span>
          )}
          <div className="flex items-center gap-2 text-stone-800 font-bold text-sm mb-1">
            <BookOpen className="w-4 h-4 text-stone-700" />
            <h4>1. Traditional Classic Ledger</h4>
          </div>
          <p className="text-xs text-stone-600 mb-3">
            Formal Ugandan academic heritage. Heavy black double borders, classic Times/Amiri typography, official government school gravitas.
          </p>
          <div className="text-[11px] space-y-1 text-stone-500 bg-stone-100 p-2 rounded-lg font-mono">
            <div>• Typography: Times New Roman / Amiri</div>
            <div>• Borders: 2px solid #1c1917 (Obsidian)</div>
            <div>• Palette: Black, Deep Slate, White</div>
            <div>• Best for: Official Ministry Audits & PLE</div>
          </div>
        </div>

        {/* Proposal 2 */}
        <div
          onClick={() => handleSelect('modern-academy')}
          className={`cursor-pointer rounded-xl p-4 border-2 transition-all relative ${
            selectedLayout === 'modern-academy'
              ? 'border-emerald-700 bg-emerald-50/40 shadow-md ring-1 ring-emerald-700'
              : 'border-stone-200 bg-white hover:border-stone-400'
          }`}
        >
          {selectedLayout === 'modern-academy' && (
            <span className="absolute top-3 right-3 bg-emerald-700 text-white rounded-full p-0.5">
              <Check className="w-3.5 h-3.5" />
            </span>
          )}
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm mb-1">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <h4>2. Modern Islamic Academy</h4>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
              Recommended
            </span>
          </div>
          <p className="text-xs text-stone-600 mb-3">
            Prestige dual-curriculum academy. Emerald & antique brass accents, crisp Montserrat headers, subtle micro-ruled cards, balanced English/Arabic parity.
          </p>
          <div className="text-[11px] space-y-1 text-emerald-900 bg-emerald-100/60 p-2 rounded-lg font-mono">
            <div>• Typography: Montserrat / Cairo / Amiri</div>
            <div>• Borders: 1.5px #0F4D25 + #C2994C Accents</div>
            <div>• Palette: Emerald Forest, Gold, Alabaster</div>
            <div>• Best for: Authentic Islamic School Identity</div>
          </div>
        </div>

        {/* Proposal 3 */}
        <div
          onClick={() => handleSelect('compact-executive')}
          className={`cursor-pointer rounded-xl p-4 border-2 transition-all relative ${
            selectedLayout === 'compact-executive'
              ? 'border-blue-700 bg-blue-50/40 shadow-md ring-1 ring-blue-700'
              : 'border-stone-200 bg-white hover:border-stone-400'
          }`}
        >
          {selectedLayout === 'compact-executive' && (
            <span className="absolute top-3 right-3 bg-blue-700 text-white rounded-full p-0.5">
              <Check className="w-3.5 h-3.5" />
            </span>
          )}
          <div className="flex items-center gap-2 text-blue-950 font-bold text-sm mb-1">
            <Printer className="w-4 h-4 text-blue-700" />
            <h4>3. Compact Executive Console</h4>
          </div>
          <p className="text-xs text-stone-600 mb-3">
            High-density Swiss administrative efficiency. Two-column split view, compact metrics bar with spark progress, minimal printer ink consumption.
          </p>
          <div className="text-[11px] space-y-1 text-blue-900 bg-blue-100/60 p-2 rounded-lg font-mono">
            <div>• Typography: Inter / Tabular Nums</div>
            <div>• Borders: 1px subtle #CBD5E1 Slate</div>
            <div>• Palette: Cobalt, Crisp Slate, White</div>
            <div>• Best for: High-Speed Batch Printing & DOS</div>
          </div>
        </div>
      </div>

      {/* Live Miniature Mockup Preview of the Selected Proposal */}
      <div className="rounded-xl border border-stone-200 overflow-hidden bg-stone-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Live Mockup Preview: {selectedLayout === 'traditional' ? 'Direction 1 (Traditional Classic)' : selectedLayout === 'modern-academy' ? 'Direction 2 (Modern Islamic Academy)' : 'Direction 3 (Compact Executive)'}
            </span>
          </div>
          <span className="text-xs text-stone-500 font-mono">Simulated A4 Preview Scale (38%)</span>
        </div>

        {/* Visual Mockup Container */}
        <div className="flex justify-center">
          <div
            className={`w-full max-w-2xl bg-white shadow-lg p-6 rounded-sm text-xs transition-all ${
              selectedLayout === 'traditional'
                ? 'font-serif border-4 border-double border-stone-900 text-stone-900'
                : selectedLayout === 'modern-academy'
                ? 'font-sans border-2 border-emerald-800 text-stone-800 shadow-emerald-950/10'
                : 'font-mono border border-slate-300 text-slate-800'
            }`}
          >
            {/* Mock Header */}
            <div
              className={`pb-4 mb-4 text-center border-b ${
                selectedLayout === 'traditional'
                  ? 'border-stone-900'
                  : selectedLayout === 'modern-academy'
                  ? 'border-emerald-800/40 bg-emerald-50/30 -mx-6 -mt-6 p-6'
                  : 'border-slate-200 bg-slate-50 -mx-6 -mt-6 p-4'
              }`}
            >
              <div className="text-lg font-extrabold tracking-wider uppercase">
                {selectedLayout === 'traditional' && 'JIDDAH ISLAMIC SCHOOLS — NSAGGU'}
                {selectedLayout === 'modern-academy' && 'JIDDAH ISLAMIC SCHOOLS'}
                {selectedLayout === 'compact-executive' && 'JIDDAH ISLAMIC SCHOOLS // ACADEMIC RECORD'}
              </div>
              <div className="text-xs text-stone-600 mt-0.5">
                P.O. BOX 34008 NSAGGU, WAKISO DISTRICT • TEL: 0700 000 000
              </div>
              <div
                className={`inline-block mt-2 px-3 py-0.5 text-xs font-bold uppercase rounded ${
                  selectedLayout === 'traditional'
                    ? 'border border-stone-900 text-stone-900'
                    : selectedLayout === 'modern-academy'
                    ? 'bg-emerald-800 text-amber-300 shadow-sm'
                    : 'bg-slate-800 text-white'
                }`}
              >
                PUPIL PROGRESS REPORT CARD — TERM 1, 2026
              </div>
            </div>

            {/* Student Info Strip */}
            <div className="grid grid-cols-4 gap-2 py-2 mb-4 bg-stone-50 px-3 rounded border border-stone-200 text-[11px]">
              <div><strong>Name:</strong> Farouk Ssemakula</div>
              <div><strong>Class:</strong> P.5 Blue</div>
              <div><strong>Admission:</strong> JIS/2024/0482</div>
              <div><strong>Division:</strong> <span className="font-bold text-emerald-700">DIVISION I</span></div>
            </div>

            {/* Mock Dual Subject Tables */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Secular */}
              <div>
                <div className="font-bold text-[11px] mb-1 uppercase tracking-wide text-stone-700">
                  Secular Performance (UNEB)
                </div>
                <table className="w-full text-[10px] border border-stone-300">
                  <thead className="bg-stone-100 border-b border-stone-300">
                    <tr>
                      <th className="p-1 text-left">Subject</th>
                      <th className="p-1 text-center">Score</th>
                      <th className="p-1 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-stone-200"><td className="p-1">ENGLISH</td><td className="p-1 text-center font-bold">90</td><td className="p-1 text-center">D1</td></tr>
                    <tr className="border-b border-stone-200"><td className="p-1">MATHEMATICS</td><td className="p-1 text-center font-bold">96</td><td className="p-1 text-center">D1</td></tr>
                    <tr className="border-b border-stone-200"><td className="p-1">SCIENCE</td><td className="p-1 text-center font-bold">94</td><td className="p-1 text-center">D1</td></tr>
                    <tr><td className="p-1">SOCIAL STUDIES</td><td className="p-1 text-center font-bold">88</td><td className="p-1 text-center">D2</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Theology */}
              <div>
                <div className="font-bold text-[11px] mb-1 uppercase tracking-wide text-stone-700">
                  Theology Performance (القسم الإسلامي)
                </div>
                <table className="w-full text-[10px] border border-stone-300">
                  <thead className="bg-stone-100 border-b border-stone-300">
                    <tr>
                      <th className="p-1 text-right">المادة</th>
                      <th className="p-1 text-center">الدرجة</th>
                      <th className="p-1 text-center">التقدير</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-stone-200"><td className="p-1 text-right font-arabic">القرآن الكريم</td><td className="p-1 text-center font-bold">98</td><td className="p-1 text-center">ممتاز</td></tr>
                    <tr className="border-b border-stone-200"><td className="p-1 text-right font-arabic">الحديث الشريف</td><td className="p-1 text-center font-bold">94</td><td className="p-1 text-center">ممتاز</td></tr>
                    <tr className="border-b border-stone-200"><td className="p-1 text-right font-arabic">الفقه الإسلامي</td><td className="p-1 text-center font-bold">93</td><td className="p-1 text-center">ممتاز</td></tr>
                    <tr><td className="p-1 text-right font-arabic">اللغة العربية</td><td className="p-1 text-center font-bold">90</td><td className="p-1 text-center">ممتاز</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comments & Stamp Area */}
            <div className="pt-2 border-t border-stone-200 grid grid-cols-3 gap-2 text-[10px]">
              <div className="col-span-2 space-y-1">
                <div><strong>Class Teacher:</strong> Dedicated, disciplined, and very bright pupil.</div>
                <div><strong>Head Teacher:</strong> Exemplary conduct and academic distinction.</div>
              </div>
              <div className="flex flex-col items-center justify-center p-1 border border-dashed border-stone-300 rounded bg-stone-50 text-[9px] text-stone-500">
                <span className="font-bold text-stone-700">OFFICIAL STAMP & SIGNATURE</span>
                <span className="text-[8px] text-emerald-700">Draggable Overlay Area</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="rounded-xl border border-stone-200 overflow-hidden bg-white">
        <table className="w-full text-left text-xs text-stone-700">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[10px]">
            <tr>
              <th className="p-3">Evaluation Criteria</th>
              <th className="p-3">1. Traditional Classic</th>
              <th className="p-3 text-emerald-900 bg-emerald-50/50">2. Modern Islamic Academy (Rec.)</th>
              <th className="p-3">3. Compact Executive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-[11px]">
            <tr>
              <td className="p-3 font-semibold">Institutional Dignity</td>
              <td className="p-3">Highest (Historic UNEB)</td>
              <td className="p-3 font-semibold text-emerald-800 bg-emerald-50/30">Exceptional (Islamic Prestige)</td>
              <td className="p-3">Moderate (Modern Utility)</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">Bilingual Harmony (English & Arabic)</td>
              <td className="p-3">Good (Serif / Amiri)</td>
              <td className="p-3 font-semibold text-emerald-800 bg-emerald-50/30">Outstanding (Tailored Weights)</td>
              <td className="p-3">Moderate (Compact Sans)</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">Ink & Toner Efficiency</td>
              <td className="p-3">Moderate (Heavy double borders)</td>
              <td className="p-3 font-semibold text-emerald-800 bg-emerald-50/30">Balanced (Optimized micro-rules)</td>
              <td className="p-3">Highest (Ultra-minimal ink)</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">Parent & Community Pride</td>
              <td className="p-3">High</td>
              <td className="p-3 font-semibold text-emerald-800 bg-emerald-50/30">Very High (Keepsake Quality)</td>
              <td className="p-3">Functional</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
