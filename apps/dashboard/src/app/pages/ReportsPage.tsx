import { useState, useMemo } from "react";
import { FileText, Download, Printer, RefreshCw, Check, ChevronDown, Eye, Zap, BarChart2, Search } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useTerms } from "@/hooks/useTerms";
import { useReports, buildReportPreviewUrl } from "@/hooks/useReports";
import { useAnalytics } from "@/hooks/useAnalytics";
import { PageState } from "@/components/PageState";
import { HeroSection } from "@/components/HeroSection";
import { toast } from "sonner";

export default function ReportsPage() {
  const { students } = useStudents();
  const { classes } = useClasses();
  const { terms, currentTerm } = useTerms();
  const { reports, loading, error, refetch, generateReport, openReportPreview } = useReports();
  const { analytics } = useAnalytics();
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [selectedTermId, setSelectedTermId] = useState(currentTerm?.id ?? "");
  const [reportType, setReportType] = useState("individual");
  const [curriculum, setCurriculum] = useState("secular");
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationDone, setGenerationDone] = useState(false);
  const [validatedCount, setValidatedCount] = useState(0);
  const [search, setSearch] = useState("");

  const classStudents = students.filter(
    (s) => selectedClass === "All Classes" || s.class === selectedClass
  );

  const handleGenerate = async () => {
    if (!selectedTermId) {
      toast.error("Select a term first");
      return;
    }
    const targets = classStudents.filter((s) => s.enrollmentId);
    if (targets.length === 0) {
      toast.error("No students with enrollments in this class");
      return;
    }
    setGenerating(true);
    setGenerationProgress(0);
    setGenerationDone(false);
    try {
      let done = 0;
      for (const student of targets) {
        await generateReport(student.enrollmentId!, selectedTermId, "eot", curriculum);
        done += 1;
        setGenerationProgress(Math.round((done / targets.length) * 100));
      }
      setGenerationDone(true);
      setValidatedCount(done);
      toast.success(`Validated ${done} report(s)`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const filteredHistory = reports.filter((r) => {
    if (search) return r.class.toLowerCase().includes(search.toLowerCase()) || r.type.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const statsCards = useMemo(() => {
    const kpis = analytics?.kpis;
    const totalEnrolled = kpis?.totalStudents ?? 0;
    const classCount = reports.reduce((sum, r) => sum + r.count, 0);
    return [
      {
        label: "Total Enrolled",
        value: String(totalEnrolled),
        subtitle: "Active students",
        color: "#10B981",
        bg: "rgba(16,185,129,0.08)",
      },
      {
        label: "Validated This Session",
        value: String(validatedCount),
        subtitle: generationDone ? "Ready to preview" : "Run generate first",
        color: "#F59E0B",
        bg: "rgba(245,158,11,0.08)",
      },
      {
        label: "Classes With Marks",
        value: String(reports.length),
        subtitle: `${classCount} student enrollments`,
        color: "#6366F1",
        bg: "rgba(99,102,241,0.08)",
      },
    ];
  }, [analytics?.kpis, reports, validatedCount, generationDone]);

  const previewFirstInClass = (className: string, termId?: string) => {
    const termIdToUse = termId || selectedTermId;
    if (!termIdToUse) {
      toast.error("Select a term first");
      return;
    }
    const student = students.find((s) => s.class === className && s.enrollmentId);
    if (!student?.enrollmentId) {
      toast.error(`No enrolled students found in ${className}`);
      return;
    }
    openReportPreview({
      enrollmentId: student.enrollmentId,
      termId: termIdToUse,
      scoreType: "eot",
    });
  };

  const printFirstInClass = (className: string, termId?: string) => {
    const termIdToUse = termId || selectedTermId;
    if (!termIdToUse) {
      toast.error("Select a term first");
      return;
    }
    const student = students.find((s) => s.class === className && s.enrollmentId);
    if (!student?.enrollmentId) {
      toast.error(`No enrolled students found in ${className}`);
      return;
    }
    openReportPreview({
      enrollmentId: student.enrollmentId,
      termId: termIdToUse,
      scoreType: "eot",
      print: true,
    });
  };

  const openClassBatchPreview = () => {
    if (!selectedTermId) {
      toast.error("Select a term first");
      return;
    }
    const first = classStudents.find((s) => s.enrollmentId);
    if (!first?.enrollmentId) {
      toast.error("No students with enrollments in this class");
      return;
    }
    openReportPreview({
      enrollmentId: first.enrollmentId,
      termId: selectedTermId,
      scoreType: "eot",
    });
  };

  return (
    <div>
      <HeroSection
        title="Report Generation Center"
        subtitle="Generate, preview, and download academic reports with one-click workflows."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Generation Panel */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#374151" }}>Generate New Reports</h2>
            <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Select options and generate reports</p>
          </div>
          <div className="p-6">
            {/* Report Type */}
            <div className="mb-5">
              <label className="block mb-3" style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Report Type</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "individual", label: "Individual", desc: "Per-student report cards", icon: FileText },
                  { id: "class", label: "Class Summary", desc: "All students in a class", icon: BarChart2 },
                  { id: "batch", label: "Batch / All", desc: "All classes at once", icon: Zap },
                ].map(({ id, label, desc, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setReportType(id)}
                    className="p-4 rounded-xl text-left border-2 transition-all"
                    style={{
                      borderColor: reportType === id ? "#10B981" : "transparent",
                      background: reportType === id ? "rgba(16,185,129,0.05)" : "#F9FAFB",
                    }}
                  >
                    <Icon className="w-5 h-5 mb-2" style={{ color: reportType === id ? "#10B981" : "#9CA3AF" }} />
                    <p style={{ fontSize: "13px", fontWeight: 600, color: reportType === id ? "#065F46" : "#374151" }}>{label}</p>
                    <p style={{ fontSize: "11px", color: "#9CA3AF" }}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Class + Term */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block mb-1.5" style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Curriculum</label>
                <div className="relative">
                  <select value={curriculum} onChange={e => setCurriculum(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl border appearance-none"
                    style={{ border: "1px solid #E5E7EB", background: "white", fontSize: "13.5px", color: "#374151" }}>
                    <option value="secular">Secular</option>
                    <option value="theology">Theology</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6B7280" }} />
                </div>
              </div>
              <div>
                <label className="block mb-1.5" style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Class</label>
                <div className="relative">
                  <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl border appearance-none"
                    style={{ border: "1px solid #E5E7EB", background: "white", fontSize: "13.5px", color: "#374151" }}>
                    <option>All Classes</option>
                    {classes.map(c => <option key={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6B7280" }} />
                </div>
              </div>
              <div>
                <label className="block mb-1.5" style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Academic Term</label>
                <div className="relative">
                  <select value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl border appearance-none"
                    style={{ border: "1px solid #E5E7EB", background: "white", fontSize: "13.5px", color: "#374151" }}>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6B7280" }} />
                </div>
              </div>
            </div>

            {/* Progress */}
            {generating && (
              <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: "13px", color: "#065F46", fontWeight: 600 }}>Generating reports...</span>
                  <span style={{ fontSize: "13px", color: "#10B981", fontWeight: 700 }}>{generationProgress}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(16,185,129,0.15)" }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${generationProgress}%`, background: "#10B981" }} />
                </div>
              </div>
            )}

            {generationDone && !generating && (
              <div className="mb-5 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <Check className="w-5 h-5" style={{ color: "#10B981" }} />
                <div>
                  <p style={{ fontSize: "13px", color: "#065F46", fontWeight: 600 }}>Reports generated successfully!</p>
                  <p style={{ fontSize: "12px", color: "#6B7280" }}>Ready for preview and download</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
                style={{ background: "linear-gradient(135deg, #10B981, #065F46)", color: "white", fontSize: "14px" }}
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {generating ? "Generating..." : "Generate Reports"}
              </button>
              {generationDone && (
                <button
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  style={{ border: "1px solid #E5E7EB", color: "#374151", fontSize: "14px" }}
                  onClick={openClassBatchPreview}
                >
                  <Eye className="w-4 h-4" /> Preview Class
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          {statsCards.map(({ label, value, subtitle, color, bg }) => (
            <div key={label} className="rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: "12px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
              <p style={{ fontSize: "32px", fontWeight: 800, color, marginTop: "4px" }}>{value}</p>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>{subtitle}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Report History */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#374151" }}>Report History</h2>
            <p style={{ fontSize: "12px", color: "#9CA3AF" }}>All previously generated reports</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
            <input
              placeholder="Search reports..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl outline-none"
              style={{ border: "1px solid #E5E7EB", background: "white", fontSize: "13px", width: "200px" }}
            />
          </div>
        </div>

        <PageState loading={loading} error={error} onRetry={refetch} empty={!loading && !error && filteredHistory.length === 0} emptyTitle="No reports yet" emptyMessage="Generate reports to see them here.">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#FAFAFA" }}>
                {["Report ID", "Type", "Class", "Term", "Count", "Date", "Status", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3 text-left" style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < filteredHistory.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
                  className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5" style={{ fontSize: "13px", color: "#9CA3AF", fontFamily: "monospace" }}>{r.id}</td>
                  <td className="px-5 py-3.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{r.type}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-1 rounded-lg" style={{ background: "rgba(16,185,129,0.08)", color: "#065F46", fontSize: "12px", fontWeight: 600 }}>{r.class}</span>
                  </td>
                  <td className="px-5 py-3.5" style={{ fontSize: "13px", color: "#6B7280" }}>{r.term}</td>
                  <td className="px-5 py-3.5" style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>{r.count} reports</td>
                  <td className="px-5 py-3.5" style={{ fontSize: "13px", color: "#6B7280" }}>{r.date}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full" style={{
                      background: r.status === "ready" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                      color: r.status === "ready" ? "#065F46" : "#92400E",
                      fontSize: "12px", fontWeight: 600
                    }}>
                      {r.status === "ready" ? <Check className="w-3 h-3" /> : <RefreshCw className="w-3 h-3 animate-spin" />}
                      {r.status === "ready" ? "Ready" : "Processing"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1.5 rounded-lg hover:bg-emerald-50"
                        title="Preview report"
                        onClick={() => previewFirstInClass(r.class, r.termId)}
                      >
                        <Eye className="w-4 h-4" style={{ color: "#10B981" }} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-blue-50"
                        title="Open printable report"
                        onClick={() => {
                          const student = students.find((s) => s.class === r.class && s.enrollmentId);
                          if (!student?.enrollmentId || !(r.termId || selectedTermId)) {
                            toast.error("Cannot open report — missing student or term");
                            return;
                          }
                          window.open(
                            buildReportPreviewUrl({
                              enrollmentId: student.enrollmentId,
                              termId: r.termId || selectedTermId,
                              scoreType: "eot",
                              curriculum: curriculum,
                            }),
                            "_blank",
                            "noopener,noreferrer"
                          );
                        }}
                      >
                        <Download className="w-4 h-4" style={{ color: "#6366F1" }} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100"
                        title="Print report"
                        onClick={() => printFirstInClass(r.class, r.termId)}
                      >
                        <Printer className="w-4 h-4" style={{ color: "#6B7280" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </PageState>
      </div>
    </div>
  );
}
