'use client';

import React from 'react';
import { Users, TrendingUp, UserCheck, Calendar } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

const sparklineData = [
  { month: 'Sep', value: 52 },
  { month: 'Oct', value: 61 },
  { month: 'Nov', value: 58 },
  { month: 'Dec', value: 65 },
  { month: 'Jan', value: 74 },
  { month: 'Feb', value: 70 },
  { month: 'Mar', value: 82 },
  { month: 'Apr', value: 79 },
  { month: 'May', value: 91 },
  { month: 'Jun', value: 88 },
  { month: 'Jul', value: 96 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-lg px-2.5 py-1.5 text-xs">
      <span className="text-slate-500">{label} · </span>
      <span className="font-bold text-emerald-600">{payload[0].value}</span>
    </div>
  );
}

export function MetricCard({ total }: { total: number }) {
  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/50 rounded-2xl p-6 relative overflow-hidden flex flex-col group hover:shadow-2xl hover:shadow-emerald-200/40 transition-all duration-500">

      {/* Background glow */}
      <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-emerald-400 rounded-full blur-[80px] opacity-15 group-hover:opacity-25 transition-opacity duration-500" />

      {/* Icon badge */}
      <div className="absolute top-5 right-5">
        <div className="w-11 h-11 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center text-orange-500 shadow-sm border border-orange-100">
          <Users size={20} />
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 text-emerald-600 mb-3">
          <UserCheck size={15} />
          <span className="text-xs font-bold uppercase tracking-wider">Total Enrollment</span>
        </div>

        <div className="flex items-baseline gap-3">
          <h2 className="text-5xl font-black text-slate-800 tracking-tight leading-none">{total}</h2>
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
            <TrendingUp size={12} />
            +18%
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1.5 font-medium">Active students · 2024–2025</p>

        {/* Mini stat chips */}
        <div className="flex gap-2 mt-4">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
            <Calendar size={11} className="text-slate-400" />
            <span className="text-xs text-slate-600 font-semibold">7 classes</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-700 font-semibold">All active</span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-24 mt-5 -mx-2 relative z-10" style={{ minHeight: 96 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={96} minWidth={100}>
          <AreaChart data={sparklineData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#10b981', stroke: 'white', strokeWidth: 2 }}
              fillOpacity={1}
              fill="url(#metricGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
