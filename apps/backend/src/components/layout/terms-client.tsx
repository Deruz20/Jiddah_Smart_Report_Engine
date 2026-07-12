"use client";

import React, { useState } from "react";
import { HeroSection } from "@/components/HeroSection";
import { RefreshCw, Plus, Calendar, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/figma-ui/ui/button";
import { createClient } from "@/utils/supabase/client";

export type AcademicTerm = {
  id: string;
  year: number;
  term: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
};

export default function TermsClient({ initialTerms }: { initialTerms: AcademicTerm[] }) {
  const [terms, setTerms] = useState<AcademicTerm[]>(initialTerms);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    term: 'beginning',
    start_date: '',
    end_date: '',
  });

  const supabase = createClient();

  const refetch = async () => {
    const { data } = await supabase.from('academic_terms').select('*').order('year', { ascending: false }).order('created_at', { ascending: false });
    if (data) setTerms(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        year: formData.year,
        term: formData.term,
      };
      if (formData.start_date) payload.start_date = formData.start_date;
      if (formData.end_date) payload.end_date = formData.end_date;

      const { error } = await supabase.from('academic_terms').insert([payload]);
      if (error) throw error;
      
      setFormData({
        year: new Date().getFullYear(),
        term: 'beginning',
        start_date: '',
        end_date: '',
      });
      refetch();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTermLabel = (term: string) => {
    const labels: Record<string, string> = {
      beginning: '1st Term',
      midterm: '2nd Term',
      endterm: '3rd Term',
    };
    return labels[term] || term;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="pb-12 w-full">
      <HeroSection
        title="Terms Management"
        subtitle="Create and manage academic terms for your institution"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8 mt-8">
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              Add New Term
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="year" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Academic Year <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  min={2000}
                  max={2100}
                  required
                  className="w-full rounded-xl border px-4 py-2.5 outline-none transition"
                  style={{ borderColor: "rgba(0,0,0,0.1)", background: "white", color: "#374151" }}
                />
              </div>

              <div>
                <label htmlFor="term" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Term Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id="term"
                  name="term"
                  value={formData.term}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border px-4 py-2.5 outline-none transition"
                  style={{ borderColor: "rgba(0,0,0,0.1)", background: "white", color: "#374151" }}
                >
                  <option value="beginning">Beginning (1st Term)</option>
                  <option value="midterm">Midterm (2nd Term)</option>
                  <option value="endterm">End Term (3rd Term)</option>
                </select>
              </div>

              <div>
                <label htmlFor="start_date" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full rounded-xl border px-4 py-2.5 outline-none transition"
                  style={{ borderColor: "rgba(0,0,0,0.1)", background: "white", color: "#374151" }}
                />
              </div>

              <div>
                <label htmlFor="end_date" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="w-full rounded-xl border px-4 py-2.5 outline-none transition"
                  style={{ borderColor: "rgba(0,0,0,0.1)", background: "white", color: "#374151" }}
                />
              </div>

              <Button
                disabled={isSubmitting}
                className="w-full py-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition bg-[#10B981] hover:bg-[#059669] text-white text-[14px]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Term
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div className="border-b px-6 py-5 flex items-center justify-between" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Academic Terms History</h2>
                <p className="text-sm text-gray-500 mt-1">All terms configured in the system</p>
              </div>
              <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-emerald-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {terms.length} Total
              </div>
            </div>

            {terms.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Academic Terms</h3>
                <p className="text-sm text-gray-500">Create your first term using the form.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Year / Term</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Duration</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {terms.map((term) => (
                      <tr key={term.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{term.year}</div>
                          <span className="inline-block mt-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-medium border border-emerald-200">
                            {getTermLabel(term.term)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {formatDate(term.start_date)}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {formatDate(term.end_date)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {term.created_at ? new Date(term.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
