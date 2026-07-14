"use client";

import React from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

export function OverviewChart({ data }: { data: { name: string; score: number; avg: number }[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            name="School Average"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorScore)"
          />
          <Area
            type="monotone"
            dataKey="avg"
            name="Previous Term"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={1}
            fill="url(#colorAvg)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
