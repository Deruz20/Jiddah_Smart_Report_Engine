import { useState } from "react";
import { Users, BookOpen, MapPin, Plus, Edit, ChevronRight } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useTeachers } from "@/hooks/useTeachers";
import { PageState } from "@/components/PageState";
import { HeroSection } from "@/components/HeroSection";
import { toast } from "sonner";

export default function ClassesPage() {
  const { classes, loading, error, refetch } = useClasses();
  const { teachers } = useTeachers();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <HeroSection
        title="Classes"
        subtitle={`${classes.length} classes · ${classes.reduce((a, c) => a + c.students, 0)} total students`}
        actions={
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
            style={{ background: "#10B981", color: "white", fontSize: "13px", fontWeight: 600 }}
            onClick={() => toast.info("Add class form")}
          >
            <Plus className="w-4 h-4" /> Add Class
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Classes", value: classes.length, color: "#10B981" },
          { label: "Total Students", value: classes.reduce((a, c) => a + c.students, 0), color: "#6366F1" },
          { label: "Avg Class Size", value: Math.round(classes.reduce((a, c) => a + c.students, 0) / classes.length), color: "#F59E0B" },
          { label: "Full Classes", value: classes.filter(c => c.students >= c.capacity).length, color: "#EF4444" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: "28px", fontWeight: 800, color }}>{value}</p>
            <p style={{ fontSize: "12px", color: "#9CA3AF" }}>{label}</p>
          </div>
        ))}
      </div>

      <PageState loading={loading} error={error} onRetry={refetch} empty={!loading && !error && classes.length === 0} emptyTitle="No classes" emptyMessage="Add a class to get started.">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {classes.map(cls => {
          const fillPercent = Math.round((cls.students / cls.capacity) * 100);
          const isSelected = selected === cls.id;
          return (
            <div
              key={cls.id}
              className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
              style={{
                background: isSelected ? "rgba(6,95,70,0.05)" : "white",
                border: `1.5px solid ${isSelected ? "#10B981" : "rgba(0,0,0,0.07)"}`,
                boxShadow: isSelected ? "0 4px 20px rgba(16,185,129,0.12)" : "0 1px 8px rgba(0,0,0,0.04)"
              }}
              onClick={() => setSelected(isSelected ? null : cls.id)}
            >
              {/* Class badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="px-3 py-1.5 rounded-xl" style={{ background: "linear-gradient(135deg, #065F46, #10B981)" }}>
                  <p className="text-white font-bold" style={{ fontSize: "14px" }}>{cls.name}</p>
                </div>
                <Edit className="w-4 h-4" style={{ color: "#9CA3AF" }} />
              </div>

              {/* Teacher */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#065F46" }}>
                    {cls.teacher.split(" ").filter(n => !["Mr.", "Mrs.", "Miss", "Ustazah"].includes(n)).map(n => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <span style={{ fontSize: "12px", color: "#6B7280" }} className="truncate">{cls.teacher}</span>
              </div>

              {/* Stats */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5" style={{ fontSize: "12px", color: "#9CA3AF" }}>
                    <Users className="w-3.5 h-3.5" /> Students
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>{cls.students}/{cls.capacity}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${fillPercent}%`,
                    background: fillPercent >= 90 ? "#EF4444" : fillPercent >= 70 ? "#F59E0B" : "#10B981"
                  }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5" style={{ fontSize: "12px", color: "#9CA3AF" }}>
                    <MapPin className="w-3.5 h-3.5" /> Room
                  </span>
                  <span style={{ fontSize: "12px", color: "#6B7280" }}>{cls.room}</span>
                </div>
              </div>

              {/* Capacity indicator */}
              <div className="flex items-center justify-between">
                <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{fillPercent}% capacity</span>
                <ChevronRight className="w-4 h-4" style={{ color: isSelected ? "#10B981" : "#9CA3AF" }} />
              </div>
            </div>
          );
        })}
      </div>
      </PageState>

      {/* Selected class detail */}
      {selected && (() => {
        const cls = classes.find(c => c.id === selected);
        if (!cls) return null;
        return (
          <div className="mt-6 rounded-2xl p-6" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <h3 className="mb-5" style={{ fontSize: "16px", fontWeight: 700, color: "#374151" }}>{cls.name} — Detailed View</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p style={{ fontSize: "11px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Class Teacher</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginTop: "4px" }}>{cls.teacher}</p>
              </div>
              <div>
                <p style={{ fontSize: "11px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Room</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginTop: "4px" }}>{cls.room}</p>
              </div>
              <div>
                <p style={{ fontSize: "11px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Enrollment</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginTop: "4px" }}>{cls.students} / {cls.capacity} students</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="px-4 py-2 rounded-xl hover:opacity-90" style={{ background: "#10B981", color: "white", fontSize: "13px", fontWeight: 600 }}
                onClick={() => toast.info("Opening class reports")}>View Reports</button>
              <button className="px-4 py-2 rounded-xl hover:bg-gray-50" style={{ border: "1px solid #E5E7EB", color: "#374151", fontSize: "13px", fontWeight: 600 }}
                onClick={() => toast.info("Opening marks entry")}>Enter Marks</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
