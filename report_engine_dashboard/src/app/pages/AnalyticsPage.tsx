import { useState } from "react";
import { Download, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import { useAnalytics } from "@/hooks/useAnalytics";
import { HeroSection } from "@/components/HeroSection";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("2024/2025");
  const { analytics, loading, error, refetch } = useAnalytics();
  const analyticsData: any = analytics ?? {
    termPerformance: [],
    classPerformance: [],
    subjectPerformance: [],
    attendanceTrend: [],
  };

  if (loading) {
    return <div className="flex justify-center min-h-[40vh] items-center"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#065F46", borderTopColor: "transparent" }} /></div>;
  }
  if (error) {
    return (
      <div className="text-center p-8">
        <p className="mb-3" style={{ color: "#991B1B" }}>{error}</p>
        <button onClick={() => refetch()} className="px-4 py-2 rounded-lg text-white" style={{ background: "#065F46" }}>Try again</button>
      </div>
    );
  }

  return (
    <div>
      <HeroSection
        title="Analytics & Performance"
        subtitle="Academic performance insights and data visualizations"
        actions={
          <>
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "#E5E7EB" }}>
              {["2022/2023", "2023/2024", "2024/2025"].map((y) => (
                <button
                  key={y}
                  onClick={() => setPeriod(y)}
                  className="px-3 py-2 transition-all"
                  style={{
                    background: period === y ? "#10B981" : "white",
                    color: period === y ? "white" : "#6B7280",
                    fontSize: "12px",
                    fontWeight: period === y ? 600 : 400,
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
              style={{ border: "1px solid #E5E7EB", color: "#374151", fontSize: "13px", fontWeight: 600, background: "white" }}
              onClick={() => toast.success("Exporting analytics report...")}
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
          </>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "School Average", value: "82%", trend: "+3.2%", up: true, color: "#10B981" },
          { label: "Pass Rate", value: "96.3%", trend: "+1.4%", up: true, color: "#10B981" },
          { label: "Top Performer", value: "Primary 5", trend: "88% avg", up: true, color: "#F59E0B" },
          { label: "Needs Attention", value: "Primary 2", trend: "76% avg", up: false, color: "#EF4444" },
        ].map(({ label, value, trend, up, color }) => (
          <div key={label} className="rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: "12px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ fontSize: "28px", fontWeight: 800, color, marginTop: "6px" }}>{value}</p>
            <div className="flex items-center gap-1 mt-1">
              {up ? <TrendingUp className="w-3.5 h-3.5" style={{ color: "#10B981" }} /> : <TrendingDown className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />}
              <span style={{ fontSize: "12px", color: up ? "#10B981" : "#EF4444", fontWeight: 600 }}>{trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Term Performance */}
        <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div className="mb-5">
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>Term Performance Comparison</h3>
            <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Average, highest and lowest scores per term</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analyticsData.termPerformance} barSize={28} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="term" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="average" name="Average" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="highest" name="Highest" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lowest" name="Lowest" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Distribution */}
        <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div className="mb-5">
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>Grade Distribution</h3>
            <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Breakdown of student grades across all subjects</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={analyticsData.gradeDistribution}
                cx="50%"
                cy="50%"
                outerRadius={85}
                innerRadius={45}
                dataKey="count"
                nameKey="grade"
                paddingAngle={2}
              >
                {(analyticsData.gradeDistribution ?? []).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Subject Performance */}
        <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div className="mb-5">
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>Subject Performance</h3>
            <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Average scores by subject — Term 3</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analyticsData.subjectPerformance} layout="vertical" barSize={10}>
              <XAxis type="number" domain={[60, 100]} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="subject" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={95} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                {(analyticsData.subjectPerformance ?? []).map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.subject.includes("Quran") || entry.subject.includes("Arabic") || entry.subject.includes("Islamic") ? "#F59E0B" : "#10B981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Trend */}
        <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div className="mb-5">
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>Attendance Trend</h3>
            <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Monthly school-wide attendance rate</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={analyticsData.attendanceTrend}>
              <defs>
                <linearGradient id="attGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Area type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2.5} fill="url(#attGrad2)" dot={{ fill: "#10B981", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Class Performance Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>Class Performance Breakdown</h3>
          <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Detailed per-class academic statistics</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#FAFAFA" }}>
                {["Class", "Average Score", "Pass Rate", "Top Student", "Subjects", "Performance"].map(h => (
                  <th key={h} className="px-5 py-3 text-left" style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(analyticsData.classPerformance ?? []).map((cls: any, i: number) => (
                <tr key={cls.class} style={{ borderBottom: i < analyticsData.classPerformance.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
                  className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-1 rounded-lg" style={{ background: "rgba(16,185,129,0.08)", color: "#065F46", fontSize: "13px", fontWeight: 600 }}>{cls.class}</span>
                  </td>
                  <td className="px-5 py-3.5" style={{ fontSize: "15px", fontWeight: 700, color: cls.avg >= 85 ? "#10B981" : cls.avg >= 75 ? "#F59E0B" : "#EF4444" }}>
                    {cls.avg}%
                  </td>
                  <td className="px-5 py-3.5" style={{ fontSize: "13px", color: "#374151" }}>
                    {cls.avg >= 80 ? "98%" : cls.avg >= 75 ? "94%" : "87%"}
                  </td>
                  <td className="px-5 py-3.5" style={{ fontSize: "13px", color: "#6B7280" }}>—</td>
                  <td className="px-5 py-3.5" style={{ fontSize: "13px", color: "#6B7280" }}>7 subjects</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
                        <div className="h-full rounded-full" style={{
                          width: `${cls.avg}%`,
                          background: cls.avg >= 85 ? "#10B981" : cls.avg >= 75 ? "#F59E0B" : "#EF4444"
                        }} />
                      </div>
                      <span style={{ fontSize: "12px", color: "#6B7280" }}>{cls.avg}/100</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
