"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Plus,
  Calendar,
  Check,
  Trash2,
  Banknote,
  Save,
  CalendarRange,
} from "lucide-react";
import { ConfirmDestructiveDialog } from "@/components/ConfirmDestructiveDialog";
import {
  DEFAULT_FEE_STRUCTURE,
  type FeeStructureConfig,
} from "@/lib/school-settings-helper";
import {
  fetchSchoolSettingsCached,
  invalidateClientCache,
} from "@/lib/client-cache";

export type AcademicTerm = {
  id: string;
  label?: string;
  academic_year?: number;
  term_number?: number;
  is_current?: boolean;
  year?: number;
  term?: string;
  start_date?: string | null;
  end_date?: string | null;
  next_term_start?: string | null;
  created_at?: string;
};

interface TermsClientProps {
  initialTerms: AcademicTerm[];
  embedded?: boolean;
  initialFeeStructure?: FeeStructureConfig;
  onTermChanged?: () => void;
}

export default function TermsClient({
  initialTerms,
  embedded = false,
  initialFeeStructure,
  onTermChanged,
}: TermsClientProps) {
  const router = useRouter();
  const [terms, setTerms] = useState<AcademicTerm[]>(initialTerms || []);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [savingTermId, setSavingTermId] = useState<string | null>(null);
  const [dirtyTermDates, setDirtyTermDates] = useState<
    Record<
      string,
      {
        start_date: string;
        end_date: string;
        next_term_start: string;
      }
    >
  >({});

  const [newTermForm, setNewTermForm] = useState({
    academic_year: new Date().getFullYear(),
    term_number: 1,
    start_date: "",
    end_date: "",
    next_term_start: "",
  });

  const [feeStructure, setFeeStructure] = useState<FeeStructureConfig>(
    initialFeeStructure || DEFAULT_FEE_STRUCTURE
  );
  const [initialFees, setInitialFees] = useState<FeeStructureConfig>(
    initialFeeStructure || DEFAULT_FEE_STRUCTURE
  );
  const [savingFees, setSavingFees] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    type: "activate" | "archive";
    term: AcademicTerm;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    if (initialTerms && initialTerms.length > 0) {
      setTerms(initialTerms);
    } else {
      void refetchTerms();
    }
  }, [initialTerms]);

  useEffect(() => {
    if (initialFeeStructure) {
      setFeeStructure(initialFeeStructure);
      setInitialFees(initialFeeStructure);
      return;
    }
    fetchSchoolSettingsCached(false).then((payload) => {
      if (payload?.fee_structure) {
        const merged = { ...DEFAULT_FEE_STRUCTURE, ...payload.fee_structure };
        setFeeStructure(merged);
        setInitialFees(merged);
      }
    });
  }, [initialFeeStructure]);

  const refetchTerms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/terms", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setTerms(json.data);
      }
    } catch {
      // keep existing state
    } finally {
      setLoading(false);
    }
  };

  const getTermDisplayLabel = (t: AcademicTerm) => {
    if (t.label) return t.label;
    if (t.term_number) return `Term ${t.term_number}`;
    const map: Record<string, string> = {
      beginning: "Term 1",
      midterm: "Term 2",
      endterm: "Term 3",
    };
    return (t.term && map[t.term]) || "Term";
  };

  const getTermYear = (t: AcademicTerm) =>
    t.academic_year ?? t.year ?? new Date().getFullYear();

  const activeTerm = terms.find((t) => t.is_current) || terms[0] || null;

  const isFeesDirty =
    JSON.stringify(feeStructure) !== JSON.stringify(initialFees);

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const label = `Term ${newTermForm.term_number}`;
      const res = await fetch("/api/settings/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academic_year: Number(newTermForm.academic_year),
          term_number: Number(newTermForm.term_number),
          label,
          start_date: newTermForm.start_date || null,
          end_date: newTermForm.end_date || null,
          next_term_start: newTermForm.next_term_start || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create term");
      toast.success(
        `${label} (${newTermForm.academic_year}) created successfully.`
      );
      setShowCreateForm(false);
      setNewTermForm({
        academic_year: new Date().getFullYear(),
        term_number: 1,
        start_date: "",
        end_date: "",
        next_term_start: "",
      });
      await refetchTerms();
      onTermChanged?.();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to create term");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveTermDates = async (term: AcademicTerm) => {
    const edits = dirtyTermDates[term.id];
    if (!edits) return;
    setSavingTermId(term.id);
    try {
      const res = await fetch("/api/settings/terms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termId: term.id,
          start_date: edits.start_date || null,
          end_date: edits.end_date || null,
          next_term_start: edits.next_term_start || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save term dates");
      setTerms((prev) =>
        prev.map((item) =>
          item.id === term.id
            ? {
                ...item,
                start_date: edits.start_date || null,
                end_date: edits.end_date || null,
                next_term_start: edits.next_term_start || null,
              }
            : item
        )
      );
      setDirtyTermDates((prev) => {
        const next = { ...prev };
        delete next[term.id];
        return next;
      });
      toast.success(`Calendar dates saved for ${getTermDisplayLabel(term)}.`);
      onTermChanged?.();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to save term dates");
    } finally {
      setSavingTermId(null);
    }
  };

  const handleSaveFeeStructure = async () => {
    setSavingFees(true);
    try {
      const res = await fetch("/api/settings/school", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fee_structure: feeStructure }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save fee structure");
      setInitialFees(feeStructure);
      invalidateClientCache();
      toast.success("Next term fee structure saved for End-of-Term report cards.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to save fee structure");
    } finally {
      setSavingFees(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    setConfirmBusy(true);
    try {
      if (confirmAction.type === "activate") {
        const res = await fetch("/api/settings/terms/active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ termId: confirmAction.term.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to switch active term");
        setTerms((prev) =>
          prev.map((item) => ({
            ...item,
            is_current: item.id === confirmAction.term.id,
          }))
        );
        invalidateClientCache();
        window.dispatchEvent(new CustomEvent("jiddah:active-term-changed"));
        toast.success(
          `Active term switched to ${getTermDisplayLabel(
            confirmAction.term
          )}, ${getTermYear(confirmAction.term)}.`
        );
        setConfirmAction(null);
        onTermChanged?.();
        router.refresh();
      } else {
        const res = await fetch(
          `/api/settings/terms?termId=${encodeURIComponent(
            confirmAction.term.id
          )}`,
          { method: "DELETE" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to archive term");
        setTerms((prev) =>
          prev.filter((item) => item.id !== confirmAction.term.id)
        );
        toast.success(
          `${getTermDisplayLabel(confirmAction.term)} (${getTermYear(
            confirmAction.term
          )}) archived.`
        );
        setConfirmAction(null);
        onTermChanged?.();
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div className={embedded ? "space-y-5" : "max-w-[760px] mx-auto py-8 px-4 space-y-5"}>
      {/* Card 1: Active Term & Calendar Management */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-[#0D5C3A]" />
              Academic Terms &amp; Calendar
            </h2>
            <p className="text-xs text-[#4B5563] mt-1">
              Switch the active reporting cycle, configure term opening/closing dates, and manage academic years.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="min-h-[44px] h-11 px-5 rounded-full bg-[#0D5C3A] hover:bg-[#0A472D] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C3A]"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? "Close Form" : "New Academic Term"}
          </button>
        </div>

        {/* 2-Column At-a-Glance Summary Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#F8FAF8] border border-[#E3E8E3] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Active Term
              </p>
              <p className="text-sm font-bold text-[#0D5C3A] mt-0.5 tabular-nums">
                {activeTerm
                  ? `${getTermDisplayLabel(activeTerm)}, ${getTermYear(activeTerm)}`
                  : "Not Set"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E2EEE2] text-[#0D5C3A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D5C3A]" />
              Live Cycle
            </span>
          </div>

          <div className="rounded-xl bg-[#F8FAF8] border border-[#E3E8E3] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Next Term Date
              </p>
              <p className="text-sm font-bold text-[#111827] mt-0.5 tabular-nums">
                {activeTerm?.next_term_start
                  ? activeTerm.next_term_start.slice(0, 10)
                  : "Not Configured"}
              </p>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                activeTerm?.next_term_start
                  ? "bg-[#E2EEE2] text-[#0D5C3A]"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {activeTerm?.next_term_start ? "Set" : "Pending"}
            </span>
          </div>
        </div>

        {/* Inline New Term Drawer */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateTerm}
            className="rounded-xl bg-[#F8FAF8] border border-[#CFE0CF] p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D5C3A]">
                Create Academic Term
              </h3>
              <span className="text-[11px] text-[#6B7280]">
                Added to `terms` table
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Academic Year
                </label>
                <input
                  type="number"
                  min={2020}
                  max={2100}
                  required
                  value={newTermForm.academic_year}
                  onChange={(e) =>
                    setNewTermForm((prev) => ({
                      ...prev,
                      academic_year: Number(e.target.value),
                    }))
                  }
                  className="w-full h-10 px-3 rounded-lg border border-[#D1D5DB] bg-white text-xs text-[#111827] tabular-nums focus:border-[#0D5C3A] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Term Number
                </label>
                <select
                  value={newTermForm.term_number}
                  onChange={(e) =>
                    setNewTermForm((prev) => ({
                      ...prev,
                      term_number: Number(e.target.value),
                    }))
                  }
                  className="w-full h-10 px-3 rounded-lg border border-[#D1D5DB] bg-white text-xs text-[#111827] focus:border-[#0D5C3A] outline-none"
                >
                  <option value={1}>Term 1</option>
                  <option value={2}>Term 2</option>
                  <option value={3}>Term 3</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Term Begins
                </label>
                <input
                  type="date"
                  value={newTermForm.start_date}
                  onChange={(e) =>
                    setNewTermForm((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                  className="w-full h-10 px-2.5 rounded-lg border border-[#D1D5DB] bg-white text-xs text-[#111827] tabular-nums focus:border-[#0D5C3A] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Term Ends
                </label>
                <input
                  type="date"
                  value={newTermForm.end_date}
                  onChange={(e) =>
                    setNewTermForm((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                  className="w-full h-10 px-2.5 rounded-lg border border-[#D1D5DB] bg-white text-xs text-[#111827] tabular-nums focus:border-[#0D5C3A] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Next Term Begins
                </label>
                <input
                  type="date"
                  value={newTermForm.next_term_start}
                  onChange={(e) =>
                    setNewTermForm((prev) => ({
                      ...prev,
                      next_term_start: e.target.value,
                    }))
                  }
                  className="w-full h-10 px-2.5 rounded-lg border border-[#D1D5DB] bg-white text-xs text-[#111827] tabular-nums focus:border-[#0D5C3A] outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="min-h-[38px] px-4 py-1.5 rounded-lg border border-[#D1D5DB] bg-white text-xs font-semibold text-[#374151] hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="min-h-[38px] px-4 py-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472D] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {creating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {creating ? "Creating..." : "Create Term"}
              </button>
            </div>
          </form>
        )}

        {/* Terms List */}
        {loading && terms.length === 0 ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-28 rounded-xl bg-[#F3F6F3] animate-pulse border border-[#E3E8E3]"
              />
            ))}
          </div>
        ) : terms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D1D5DB] p-8 text-center">
            <Calendar className="w-8 h-8 text-[#0D5C3A] mx-auto mb-2 opacity-75" />
            <p className="text-sm font-semibold text-[#111827]">
              No academic terms configured yet
            </p>
            <p className="text-xs text-[#6B7280] mt-1">
              Click &ldquo;New Academic Term&rdquo; above to create Term 1, Term 2, or Term 3.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {terms.map((term) => {
              const currentEdits = dirtyTermDates[term.id];
              const startVal =
                currentEdits?.start_date ?? (term.start_date?.slice(0, 10) || "");
              const endVal =
                currentEdits?.end_date ?? (term.end_date?.slice(0, 10) || "");
              const nextVal =
                currentEdits?.next_term_start ??
                (term.next_term_start?.slice(0, 10) || "");
              const isRowDirty = Boolean(currentEdits);
              const isRowSaving = savingTermId === term.id;

              return (
                <div
                  key={term.id}
                  className={`rounded-xl p-4 transition-all ${
                    term.is_current
                      ? "bg-[#F8FAF8] border-2 border-[#0D5C3A]"
                      : "bg-white border border-[#E3E8E3] hover:border-[#C5D1C5]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-[#111827]">
                        {getTermDisplayLabel(term)}
                      </span>
                      <span className="text-xs font-semibold text-[#4B5563] px-2 py-0.5 rounded-md bg-[#EEF3EE] tabular-nums">
                        {getTermYear(term)}
                      </span>
                      {term.is_current && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-[#E2EEE2] text-[#0D5C3A]">
                          <Check className="w-3 h-3" />
                          Active Term
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!term.is_current && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ type: "activate", term })
                            }
                            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[#0D5C3A]/30 text-[#0D5C3A] hover:bg-[#E2EEE2]/60 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Set as Active
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ type: "archive", term })
                            }
                            aria-label={`Archive ${getTermDisplayLabel(term)}`}
                            className="min-h-[36px] p-2 rounded-lg border border-[#E3E8E3] text-[#6B7280] hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1">
                        Term Start Date
                      </label>
                      <input
                        type="date"
                        value={startVal}
                        onChange={(e) =>
                          setDirtyTermDates((prev) => ({
                            ...prev,
                            [term.id]: {
                              start_date: e.target.value,
                              end_date: endVal,
                              next_term_start: nextVal,
                            },
                          }))
                        }
                        className="w-full h-10 px-3 rounded-lg border border-[#D1D5DB] bg-white text-xs text-[#111827] tabular-nums focus:border-[#0D5C3A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1">
                        Term End Date
                      </label>
                      <input
                        type="date"
                        value={endVal}
                        onChange={(e) =>
                          setDirtyTermDates((prev) => ({
                            ...prev,
                            [term.id]: {
                              start_date: startVal,
                              end_date: e.target.value,
                              next_term_start: nextVal,
                            },
                          }))
                        }
                        className="w-full h-10 px-3 rounded-lg border border-[#D1D5DB] bg-white text-xs text-[#111827] tabular-nums focus:border-[#0D5C3A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1">
                        Next Term Begins Date
                      </label>
                      <input
                        type="date"
                        value={nextVal}
                        onChange={(e) =>
                          setDirtyTermDates((prev) => ({
                            ...prev,
                            [term.id]: {
                              start_date: startVal,
                              end_date: endVal,
                              next_term_start: e.target.value,
                            },
                          }))
                        }
                        className="w-full h-10 px-3 rounded-lg border border-[#D1D5DB] bg-white text-xs text-[#111827] tabular-nums focus:border-[#0D5C3A] outline-none"
                      />
                    </div>
                  </div>

                  {isRowDirty && (
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-[#E3E8E3]">
                      <button
                        type="button"
                        onClick={() =>
                          setDirtyTermDates((prev) => {
                            const next = { ...prev };
                            delete next[term.id];
                            return next;
                          })
                        }
                        className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[#D1D5DB] bg-white text-xs font-semibold text-[#4B5563] hover:bg-gray-50 cursor-pointer"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        disabled={isRowSaving}
                        onClick={() => void handleSaveTermDates(term)}
                        className="min-h-[36px] px-4 py-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472D] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                      >
                        {isRowSaving ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        {isRowSaving ? "Saving..." : "Save Term Dates"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card 2: Next Term Fee Structure (End-of-Term Report Footer) */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6 space-y-5">
        <div>
          <h3 className="text-base font-bold text-[#111827] flex items-center gap-2">
            <Banknote className="w-4 h-4 text-[#0D5C3A]" />
            Next Term Fee Structure
          </h3>
          <p className="text-xs text-[#4B5563] mt-1">
            Displayed on End-of-Term (EOT) report card footers for Nursery, Lower Primary, Upper Primary, and Boarding sections.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">
              Nursery Section (Day)
            </label>
            <input
              type="text"
              value={feeStructure.nursery_day}
              onChange={(e) =>
                setFeeStructure((prev) => ({
                  ...prev,
                  nursery_day: e.target.value,
                }))
              }
              placeholder="UGX 350,000"
              className="w-full h-10 px-3.5 rounded-xl border border-[#D1D5DB] bg-white text-sm text-[#111827] tabular-nums focus:border-[#0D5C3A] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">
              Lower Primary (P.1 – P.3 Day)
            </label>
            <input
              type="text"
              value={feeStructure.lower_primary_day}
              onChange={(e) =>
                setFeeStructure((prev) => ({
                  ...prev,
                  lower_primary_day: e.target.value,
                }))
              }
              placeholder="UGX 420,000"
              className="w-full h-10 px-3.5 rounded-xl border border-[#D1D5DB] bg-white text-sm text-[#111827] tabular-nums focus:border-[#0D5C3A] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">
              Upper Primary (P.4 – P.7 Day)
            </label>
            <input
              type="text"
              value={feeStructure.upper_primary_day}
              onChange={(e) =>
                setFeeStructure((prev) => ({
                  ...prev,
                  upper_primary_day: e.target.value,
                }))
              }
              placeholder="UGX 480,000"
              className="w-full h-10 px-3.5 rounded-xl border border-[#D1D5DB] bg-white text-sm text-[#111827] tabular-nums focus:border-[#0D5C3A] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">
              Boarding Section (All Classes)
            </label>
            <input
              type="text"
              value={feeStructure.boarding}
              onChange={(e) =>
                setFeeStructure((prev) => ({
                  ...prev,
                  boarding: e.target.value,
                }))
              }
              placeholder="UGX 850,000"
              className="w-full h-10 px-3.5 rounded-xl border border-[#D1D5DB] bg-white text-sm text-[#111827] tabular-nums focus:border-[#0D5C3A] outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">
              Fee Payment Instructions / Bank Pay Code Note
            </label>
            <input
              type="text"
              value={feeStructure.notes || ""}
              onChange={(e) =>
                setFeeStructure((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              placeholder="All fees are payable via school bank pay code prior to term opening."
              className="w-full h-10 px-3.5 rounded-xl border border-[#D1D5DB] bg-white text-sm text-[#111827] focus:border-[#0D5C3A] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#E3E8E3]">
          <span className="text-xs text-[#6B7280]">
            {isFeesDirty ? "Unsaved changes to fee schedule" : "Fee schedule synced with Supabase"}
          </span>
          <div className="flex items-center gap-2">
            {isFeesDirty && (
              <button
                type="button"
                onClick={() => setFeeStructure(initialFees)}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-[#D1D5DB] text-xs font-semibold text-[#374151] hover:bg-gray-50 cursor-pointer"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              disabled={!isFeesDirty || savingFees}
              onClick={() => void handleSaveFeeStructure()}
              className="min-h-[40px] px-5 py-2 rounded-xl bg-[#0D5C3A] hover:bg-[#0A472D] text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {savingFees ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {savingFees ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDestructiveDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === "activate"
            ? `Switch Active Term to ${
                confirmAction?.term
                  ? `${getTermDisplayLabel(confirmAction.term)}, ${getTermYear(
                      confirmAction.term
                    )}`
                  : "Term"
              }?`
            : `Archive ${
                confirmAction?.term
                  ? `${getTermDisplayLabel(confirmAction.term)} (${getTermYear(
                      confirmAction.term
                    )})`
                  : "Term"
              }?`
        }
        description={
          confirmAction?.type === "activate"
            ? "Switching the active term immediately updates the Topbar active term badge and default reporting cycle across Marks Entry, Secular Hub, Theology Hub, and Report Center."
            : "Archiving removes this inactive term record. Active terms cannot be archived."
        }
        confirmLabel={
          confirmAction?.type === "activate" ? "Set as Active Term" : "Archive Term"
        }
        variant={confirmAction?.type === "activate" ? "primary" : "danger"}
        loading={confirmBusy}
        onCancel={() => setConfirmAction(null)}
        onConfirm={executeConfirmedAction}
      />
    </div>
  );
}
