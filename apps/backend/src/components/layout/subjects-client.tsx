"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Edit, Trash2, BookOpen, Search } from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import { Button } from "@/components/figma-ui/ui/button";
import { Input } from "@/components/figma-ui/ui/input";
import { Label } from "@/components/figma-ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/figma-ui/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/figma-ui/ui/dialog";
import { createClient } from "@/utils/supabase/client";

const getSectionColor = (section: string) => {
  const colors: Record<string, string> = {
    nursery: "bg-pink-100 text-pink-800 border-pink-200",
    lower_primary: "bg-[#065F46]/10 text-[#065F46] border-[#065F46]/20",
    upper_primary: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20",
  };
  return colors[section] || "bg-gray-100 text-gray-800 border-gray-200";
};

const getCurriculumColor = (type: string) => {
  const colors: Record<string, string> = {
    secular: "bg-indigo-100 text-indigo-800 border-indigo-200",
    theology: "bg-amber-100 text-amber-800 border-amber-200",
  };
  return colors[type] || "bg-gray-100 text-gray-800 border-gray-200";
};

const getSectionLabel = (section: string) => {
  const labels: Record<string, string> = {
    nursery: "Nursery",
    lower_primary: "Lower Primary",
    upper_primary: "Upper Primary",
  };
  return labels[section] || section;
};

export type SubjectData = {
  id: string;
  subject_name: string;
  curriculum: string;
  section: string;
};

export default function SubjectsClient({ initialSubjects }: { initialSubjects: SubjectData[] }) {
  const [subjects, setSubjects] = useState<SubjectData[]>(initialSubjects);
  const [search, setSearch] = useState("");
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Form states
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);
  const [formData, setFormData] = useState({ subject_name: "", curriculum: "secular", section: "nursery" });
  const [isSubmitting, setIsSubmitting] = useState(false);



  const filteredSubjects = subjects.filter(s => 
    s.subject_name.toLowerCase().includes(search.toLowerCase()) || 
    getSectionLabel(s.section || "").toLowerCase().includes(search.toLowerCase())
  );

  const refetch = async () => {
    // We fetch both circular and theology subjects and combine them since the UI manages both
    const supabase = createClient();
    const { data: circular } = await supabase.from('circular_subjects').select('id, subject_name, section');
    const { data: theology } = await supabase.from('theology_subjects').select('id, subject_name, section');
    
    const combined = [
      ...(circular || []).map((s: any) => ({ ...s, curriculum: 'secular' })),
      ...(theology || []).map((s: any) => ({ ...s, curriculum: 'theology' }))
    ];
    setSubjects(combined);
  };

  const handleCreate = async () => {
    if (!formData.subject_name.trim()) return alert("Subject name is required");
    setIsSubmitting(true);
    const supabase = createClient();
    try {
      const table = formData.curriculum === 'theology' ? 'theology_subjects' : 'circular_subjects';
      const payload = {
        subject_name: formData.subject_name,
        section: formData.curriculum === 'theology' ? null : formData.section
      };
      
      const { error } = await supabase.from(table).insert([payload]);
      if (error) throw error;
      
      setIsCreateOpen(false);
      setFormData({ subject_name: "", curriculum: "secular", section: "nursery" });
      refetch();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!formData.subject_name.trim() || !selectedSubject) return alert("Subject name is required");
    setIsSubmitting(true);
    const supabase = createClient();
    try {
      const table = formData.curriculum === 'theology' ? 'theology_subjects' : 'circular_subjects';
      
      // If curriculum changed, we'd theoretically need to delete from old and insert to new.
      // But let's assume simple update for now without curriculum change.
      if (selectedSubject.curriculum !== formData.curriculum) {
        throw new Error("Changing curriculum after creation is not supported. Delete and recreate.");
      }

      const payload = {
        subject_name: formData.subject_name,
        section: formData.curriculum === 'theology' ? null : formData.section
      };

      const { error } = await supabase.from(table).update(payload).eq('id', selectedSubject.id);
      if (error) throw error;
      
      setIsEditOpen(false);
      refetch();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSubject) return;
    setIsSubmitting(true);
    const supabase = createClient();
    try {
      const table = selectedSubject.curriculum === 'theology' ? 'theology_subjects' : 'circular_subjects';
      const { error } = await supabase.from(table).delete().eq('id', selectedSubject.id);
      if (error) throw error;
      setIsDeleteOpen(false);
      refetch();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (sub: SubjectData) => {
    setSelectedSubject(sub);
    setFormData({ subject_name: sub.subject_name, curriculum: sub.curriculum || "secular", section: sub.section || "nursery" });
    setIsEditOpen(true);
  };

  const openDelete = (sub: SubjectData) => {
    setSelectedSubject(sub);
    setIsDeleteOpen(true);
  };

  return (
    <div className="pb-12 w-full">
      <HeroSection
        title="Subjects Management"
        subtitle={`${subjects.length} subjects configured across both curriculums`}
        actions={
          <Button
            className="bg-[#065F46] hover:bg-[#047857] text-white shadow-md shadow-[#065F46]/20 transition-all rounded-xl"
            onClick={() => {
              setFormData({ subject_name: "", curriculum: "secular", section: "nursery" });
              setIsCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Subject
          </Button>
        }
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search subjects..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-gray-200 focus-visible:ring-[#065F46]" 
            />
          </div>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No subjects found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search ? "Try adjusting your search query." : "Add your first subject to get started."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence>
              {filteredSubjects.map((sub, idx) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:border-[#065F46]/30 hover:shadow-lg hover:shadow-[#065F46]/5 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#065F46] to-[#F97316] opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-3 mb-2 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#F97316] shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{sub.subject_name}</h3>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getCurriculumColor(sub.curriculum || "secular")}`}>
                        {sub.curriculum || "secular"}
                      </span>
                      {sub.section && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getSectionColor(sub.section)}`}>
                          {getSectionLabel(sub.section)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(sub)} className="h-8 w-8 text-gray-500 hover:text-[#065F46] hover:bg-[#065F46]/10 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDelete(sub)} className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
            <DialogDescription>Create a new subject for the system.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input 
                value={formData.subject_name} 
                onChange={e => setFormData({ ...formData, subject_name: e.target.value })} 
                placeholder="e.g., Mathematics, Quran"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Curriculum</Label>
              <Select value={formData.curriculum} onValueChange={(v) => setFormData({ ...formData, curriculum: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select curriculum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="secular">Secular</SelectItem>
                  <SelectItem value="theology">Theology</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.curriculum === 'secular' && (
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={formData.section} onValueChange={(v) => setFormData({ ...formData, section: v })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nursery">Nursery</SelectItem>
                    <SelectItem value="lower_primary">Lower Primary</SelectItem>
                    <SelectItem value="upper_primary">Upper Primary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting} className="rounded-xl bg-[#065F46] hover:bg-[#047857] text-white">
              {isSubmitting ? "Saving..." : "Create Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>Modify the subject details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input 
                value={formData.subject_name} 
                onChange={e => setFormData({ ...formData, subject_name: e.target.value })} 
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Curriculum</Label>
              <Select value={formData.curriculum} onValueChange={(v) => setFormData({ ...formData, curriculum: v })} disabled>
                <SelectTrigger className="rounded-xl bg-gray-50">
                  <SelectValue placeholder="Select curriculum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="secular">Secular</SelectItem>
                  <SelectItem value="theology">Theology</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.curriculum === 'secular' && (
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={formData.section} onValueChange={(v) => setFormData({ ...formData, section: v })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nursery">Nursery</SelectItem>
                    <SelectItem value="lower_primary">Lower Primary</SelectItem>
                    <SelectItem value="upper_primary">Upper Primary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEdit} disabled={isSubmitting} className="rounded-xl bg-[#065F46] hover:bg-[#047857] text-white">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Subject</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-bold text-gray-900">{selectedSubject?.subject_name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="rounded-xl">
              {isSubmitting ? "Deleting..." : "Yes, delete subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
