import React from 'react';
import { Lightbulb, Hash, ShieldCheck, BookOpen } from 'lucide-react';

const tips = [
  {
    icon: Hash,
    title: 'Auto-generate Admission Numbers',
    body: 'Use the auto-generator in Step 2 for standardized, conflict-free IDs.',
    color: 'emerald',
  },
  {
    icon: ShieldCheck,
    title: 'Unique Admission Numbers',
    body: 'Numbers must be completely unique across all academic years.',
    color: 'orange',
  },
  {
    icon: BookOpen,
    title: 'Create Classes First',
    body: 'Ensure circular and theology classes exist before enrolling students.',
    color: 'emerald',
  },
];

export function RegistrationTips() {
  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/50 rounded-2xl p-5 relative overflow-hidden flex-1">
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-orange-100 to-emerald-50 rounded-full blur-2xl opacity-60 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center text-orange-500">
            <Lightbulb size={15} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Registration Tips</h3>
        </div>
        <ul className="space-y-3">
          {tips.map((tip) => {
            const Icon = tip.icon;
            return (
              <li key={tip.title} className="flex gap-3">
                <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                  tip.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-500'
                }`}>
                  <Icon size={13} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{tip.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{tip.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
