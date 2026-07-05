import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, BookOpen, Search } from "lucide-react";
import { useSubjects } from "@/hooks/useSubjects";
import { PageState } from "@/components/PageState";
import { HeroSection } from "@/components/HeroSection";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/app/components/ui/dialog";

import { api } from "@/services/api/client";

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

export default function SubjectsPage() {
  const { subjects, loading, error, refetch } = useSubjects();
  const [search, setSearch] = useState("");
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Form states
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [formData, setFormData] = useState({ subject_name: "", curriculum: "secular", section: "nursery" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSubjects = subjects.filter(s => 
    s.subject_name.toLowerCase().includes(search.toLowerCase()) || 
    getSectionLabel(s.section || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.subject_name.trim()) return toast.error("Subject name is required");
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (payload.curriculum === 'theology') {
        payload.section = ''; // Theology doesn't strictly require section in the UI if not needed, but we can pass it
      }
      
      await api.post("/subjects", payload);
      toast.success("Subject created successfully");
      setIsCreateOpen(false);
      setFormData({ subject_name: "", curriculum: "secular", section: "nursery" });
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!formData.subject_name.trim()) return toast.error("Subject name is required");
    setIsSubmitting(true);
    try {
      await api.put(`/subjects/${selectedSubject.id}`, formData);
      toast.success("Subject updated successfully");
      setIsEditOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await api.delete(`/subjects/${selectedSubject.id}?curriculum=${selectedSubject.curriculum}`);
      toast.success("Subject deleted successfully");
      setIsDeleteOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (sub: any) => {
    setSelectedSubject(sub);
    setFormData({ subject_name: sub.subject_name, curriculum: sub.curriculum || "secular", section: sub.section || "nursery" });
    setIsEditOpen(true);
  };

  const openDelete = (sub: any) => {
    setSelectedSubject(sub);
    setIsDeleteOpen(true);
  };

  return (
    <div className="pb-12">
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

      <div className="max-w-7xl mx-auto px-6 mt-8">
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

        <PageState 
          loading={loading} 
          error={error} 
          onRetry={refetch} 
          empty={!loading && !error && filteredSubjects.length === 0} 
          emptyTitle="No subjects found" 
          emptyMessage={search ? "Try adjusting your search query." : "Add your first subject to get started."}
        >
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
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#F97316]">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{sub.subject_name}</h3>
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
        </PageState>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting} className="rounded-xl bg-[#065F46] hover:bg-[#047857]">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEdit} disabled={isSubmitting} className="rounded-xl bg-[#065F46] hover:bg-[#047857]">
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
