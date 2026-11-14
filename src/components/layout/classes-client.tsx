"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Edit, Trash2, BookMarked, Search, Eye, FileText, ArrowRightLeft } from "lucide-react";
import { MoreActionsMenu } from "@/components/ui/more-actions-menu";
import { CustomPillSelect } from "@/components/ui/custom-pill-select";
import { toast } from "sonner";
import { Button } from "@/components/figma-ui/ui/button";
import { Input } from "@/components/figma-ui/ui/input";
import { Label } from "@/components/figma-ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/figma-ui/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/figma-ui/ui/dialog";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const getSectionColor = (section: string) => {
  const colors: Record<string, string> = {
    nursery: "bg-pink-100 text-pink-800 border-pink-200",
    lower_primary: "bg-[#065F46]/10 text-[#065F46] border-[#065F46]/20",
    upper_primary: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20",
    theology: "bg-amber-50 text-amber-800 border-amber-200",
  };
  return colors[section] || "bg-gray-100 text-gray-800 border-gray-200";
};

const getSectionLabel = (section: string) => {
  const labels: Record<string, string> = {
    nursery: "Nursery",
    lower_primary: "Lower Primary",
    upper_primary: "Upper Primary",
    theology: "Theology Cohort",
  };
  return labels[section] || section;
};

export type ClassData = {
  id: string;
  class_name: string;
  section: string;
  track?: "secular" | "theology";
};

export default function ClassesClient({
  initialClasses,
  canManageClasses = true,
}: {
  initialClasses: ClassData[];
  canManageClasses?: boolean;
}) {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassData[]>(initialClasses);
  const [search, setSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("all");

  const sectionFilterOptions = [
    { value: "all", label: "All Sections" },
    { value: "nursery", label: "Nursery" },
    { value: "lower_primary", label: "Lower Primary" },
    { value: "upper_primary", label: "Upper Primary" },
    { value: "theology", label: "Theology" },
  ];
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Form states
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [formData, setFormData] = useState({ class_name: "", section: "nursery" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredClasses = classes.filter(c => {
    const matchesSearch =
      c.class_name.toLowerCase().includes(search.toLowerCase()) || 
      getSectionLabel(c.section || "").toLowerCase().includes(search.toLowerCase());
    const matchesSection =
      selectedSection === "all" || c.section === selectedSection;
    return matchesSearch && matchesSection;
  });

  const refetch = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('circular_classes').select('*').order('section').order('class_name');
    if (data) setClasses(data);
    router.refresh();
  };

  const handleCreate = async () => {
    if (!formData.class_name.trim()) {
      toast.error("Class name is required");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.from('circular_classes').insert([formData]);
      if (error) throw error;
      toast.success("Class created successfully");
      setIsCreateOpen(false);
      setFormData({ class_name: "", section: "nursery" });
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to create class");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!formData.class_name.trim() || !selectedClass) {
      toast.error("Class name is required");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.from('circular_classes').update(formData).eq('id', selectedClass.id);
      if (error) throw error;
      toast.success("Class updated successfully");
      setIsEditOpen(false);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update class");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClass) return;
    setIsSubmitting(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.from('circular_classes').delete().eq('id', selectedClass.id);
      if (error) throw error;
      toast.success("Class deleted successfully");
      setIsDeleteOpen(false);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete class");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (cls: ClassData) => {
    setSelectedClass(cls);
    setFormData({ class_name: cls.class_name, section: cls.section || "nursery" });
    setIsEditOpen(true);
  };

  const openDelete = (cls: ClassData) => {
    setSelectedClass(cls);
    setIsDeleteOpen(true);
  };

  return (
    <div className="pb-12 w-full">
      {/* Compact single horizontal pill bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-xl">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input 
              placeholder="Search classes..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-full bg-[#F0F4F9] dark:bg-[#1E1F20] border-0 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-[#0D5C3A]" 
            />
          </div>
          <CustomPillSelect
            id="classes-section-filter"
            ariaLabel="Section filter"
            value={selectedSection}
            onChange={(val) => setSelectedSection(val)}
            options={sectionFilterOptions}
            className="h-9 text-xs rounded-full shrink-0"
          />
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#F0F4F9] dark:bg-[#1E1F20] text-xs font-semibold text-stone-600 dark:text-stone-400 tabular-nums hidden sm:inline-block">
            {filteredClasses.length} of {classes.length}
          </span>
        </div>

        {canManageClasses && (
          <Button
            className="rounded-full h-9 px-4 bg-[#0D5C3A] hover:bg-[#09472C] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
            onClick={() => {
              setFormData({ class_name: "", section: "nursery" });
              setIsCreateOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Class
          </Button>
        )}
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 mt-2">
        {filteredClasses.length === 0 ? (
          <div className="text-center py-12">
            <BookMarked className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No classes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search ? "Try adjusting your search query." : "Add your first class to get started."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredClasses.map((cls, idx) => (
               <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18, delay: idx * 0.04 }}
                  className="group relative bg-white dark:bg-[#111815] border border-[#E4EAE6] dark:border-[#1E2B26] rounded-2xl p-4 sm:p-5 hover:border-[#0D5C3A]/40 dark:hover:border-[#10B981]/40 hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#065F46] to-[#F97316] opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <Link href={`/admin/classes/${cls.id}`} className="block">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-[#F4F7F5] dark:bg-[#16211D] border border-[#E4EAE6] dark:border-[#24312C] flex items-center justify-center text-[#065F46] dark:text-[#34D399] shrink-0">
                          <BookMarked className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-[#111827] dark:text-[#F3F7F5] text-base leading-tight truncate group-hover:text-[#065F46] dark:group-hover:text-[#34D399] transition-colors">{cls.class_name}</h3>
                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border truncate max-w-full ${getSectionColor(cls.section || "")}`}>
                            {getSectionLabel(cls.section || "")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {canManageClasses && cls.track !== "theology" && (
                    <div className="flex items-center justify-end mt-4 pt-3 border-t border-[#E4EAE6]/70 dark:border-[#1E2B26]">
                      <MoreActionsMenu
                        items={[
                          {
                            label: "View Dashboard",
                            icon: Eye,
                            onClick: () => {
                              window.location.href = `/admin/classes/${cls.id}`;
                            },
                          },
                          {
                            label: "Edit Class",
                            icon: Edit,
                            onClick: () => openEdit(cls),
                          },
                          {
                            label: "Print Class Roster",
                            icon: FileText,
                            onClick: () => {
                              window.location.href = `/admin/classes/${cls.id}`;
                            },
                          },
                          {
                            label: "Assign Teacher",
                            icon: ArrowRightLeft,
                            onClick: () => {
                              window.location.href = `/admin/classes/${cls.id}`;
                            },
                          },
                          {
                            label: "Remove Class",
                            icon: Trash2,
                            destructive: true,
                            onClick: () => openDelete(cls),
                          },
                        ]}
                        align="end"
                      />
                    </div>
                  )}
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
            <DialogTitle>Add New Class</DialogTitle>
            <DialogDescription>Create a new class for the system.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Class Name</Label>
              <Input 
                value={formData.class_name} 
                onChange={e => setFormData({ ...formData, class_name: e.target.value })} 
                placeholder="e.g., Primary 1"
                className="rounded-xl"
              />
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
            <Button onClick={handleCreate} disabled={isSubmitting} className="rounded-xl bg-[#065F46] hover:bg-[#047857] text-white">
              {isSubmitting ? "Saving..." : "Create Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>Modify the class details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Class Name</Label>
              <Input 
                value={formData.class_name} 
                onChange={e => setFormData({ ...formData, class_name: e.target.value })} 
                className="rounded-xl"
              />
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
            <DialogTitle className="text-red-600">Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-bold text-gray-900">{selectedClass?.class_name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="rounded-xl">
              {isSubmitting ? "Deleting..." : "Yes, delete class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
