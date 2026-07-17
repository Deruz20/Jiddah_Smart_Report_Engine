'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type SectionType = 'Nursery' | 'Lower Primary' | 'Upper Primary' | '';
type TheologySectionType = 'روضة' | 'ابتدائية_سفلى' | 'ابتدائية_عليا' | '';

interface CircularClass {
  id: string;
  class_name: string;
  section: string;
}

interface TheologyClass {
  id: string;
  class_name_arabic: string;
  class_name_english: string;
  level?: string;
}

interface EditFormData {
  name: string;
  arabic_name: string;
  gender: 'Male' | 'Female' | '';
  admission_number: string;
  section: SectionType;
  circular_class_id: string;
  theology_section: TheologySectionType;
  theology_class_id: string;
  religion: 'Muslim' | 'Non-Muslim' | '';
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onSaved: () => void;
}

export function EditStudentModal({ isOpen, onClose, student, onSaved }: EditStudentModalProps) {
  const [formData, setFormData] = useState<EditFormData>({
    name: '',
    arabic_name: '',
    gender: '',
    admission_number: '',
    section: '',
    circular_class_id: '',
    theology_section: '',
    theology_class_id: '',
    religion: '',
  });

  const [circularClasses, setCircularClasses] = useState<CircularClass[]>([]);
  const [theologyClasses, setTheologyClasses] = useState<TheologyClass[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && student) {
      setFormData({
        name: student.name || '',
        arabic_name: student.arabic_name || '',
        gender: student.gender || '',
        admission_number: student.admission_number || '',
        section: (student.section || '') as SectionType,
        circular_class_id: student.circular_class_id || '',
        theology_section: '', // Derived later or not strictly needed
        theology_class_id: student.theology_class_id || '',
        religion: student.is_muslim ? 'Muslim' : 'Non-Muslim',
      });
      fetchClasses();
    }
  }, [isOpen, student]);

  const fetchClasses = async () => {
    setIsFetching(true);
    setError(null);
    try {
      const [circularRes, theologyRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/theology-classes'),
      ]);
      if (!circularRes.ok || !theologyRes.ok) throw new Error('Failed to fetch classes');
      
      const circularData = await circularRes.json();
      const theologyData = await theologyRes.json();
      
      setCircularClasses(circularData);
      setTheologyClasses(theologyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch classes');
    } finally {
      setIsFetching(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.admission_number || !formData.circular_class_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student');

      toast.success('Student profile updated successfully');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">Edit Student</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {isFetching ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="animate-spin text-emerald-500 mb-2" size={32} />
                <p className="text-slate-500 text-sm">Loading classes...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            ) : (
              <form id="edit-student-form" onSubmit={handleUpdate} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Full Name *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Arabic Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        dir="rtl"
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-arabic text-right"
                        value={formData.arabic_name}
                        onChange={(e) => setFormData({ ...formData, arabic_name: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!formData.name) {
                            toast.error('Please enter an English name first');
                            return;
                          }
                          toast.loading('Transliterating...', { id: 'transliterate-edit' });
                          try {
                            const res = await fetch('/api/transliterate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ names: [formData.name] })
                            });
                            if (res.ok) {
                              const data = await res.json();
                              if (data.transliterated?.[0]) {
                                setFormData({ ...formData, arabic_name: data.transliterated[0] });
                                toast.success('Transliterated successfully', { id: 'transliterate-edit' });
                              } else {
                                toast.error('Failed to transliterate', { id: 'transliterate-edit' });
                              }
                            } else {
                              toast.error('Failed to transliterate', { id: 'transliterate-edit' });
                            }
                          } catch (e) {
                            toast.error('Error connecting to server', { id: 'transliterate-edit' });
                          }
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-600 text-sm font-semibold transition-all shadow-sm"
                      >
                        <RefreshCw size={14} />
                        Auto
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Admission No. *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm uppercase"
                      value={formData.admission_number}
                      onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Gender</label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Religion</label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      value={formData.religion}
                      onChange={(e) => setFormData({ ...formData, religion: e.target.value as 'Muslim' | 'Non-Muslim' })}
                    >
                      <option value="">Select Religion</option>
                      <option value="Muslim">Muslim</option>
                      <option value="Non-Muslim">Non-Muslim</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Secular Class *</label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      value={formData.circular_class_id}
                      onChange={(e) => setFormData({ ...formData, circular_class_id: e.target.value })}
                      required
                    >
                      <option value="">Select Class</option>
                      {circularClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.class_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.religion === 'Muslim' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Theology Class</label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-arabic"
                      value={formData.theology_class_id}
                      onChange={(e) => setFormData({ ...formData, theology_class_id: e.target.value })}
                    >
                      <option value="">Select Theology Class</option>
                      {theologyClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.class_name_arabic}</option>
                      ))}
                    </select>
                  </div>
                )}
              </form>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-student-form"
              disabled={isSubmitting || isFetching}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
