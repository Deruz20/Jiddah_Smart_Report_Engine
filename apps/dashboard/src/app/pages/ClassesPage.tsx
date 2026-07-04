import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, MapPin, Users, BookMarked, Search } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { PageState } from "@/components/PageState";
import { HeroSection } from "@/components/HeroSection";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/app/components/ui/dialog";

const API_BASE = "/api";

const getSectionColor = (section: string) => {
  const colors: Record<string, string> = {
    nursery: "bg-pink-100 text-pink-800 border-pink-200",
    lower_primary: "bg-[#065F46]/10 text-[#065F46] border-[#065F46]/20",
    upper_primary: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20",
  };
  return colors[section] || "bg-gray-100 text-gray-800 border-gray-200";
};

const getSectionLabel = (section: string) => {
  const labels: Record<string, string> = {
    nursery: "Nursery",
    lower_primary: "Lower Primary",
    upper_primary: "Upper Primary",
  };
  return labels[section] || section;
};

export default function ClassesPage() {
  const { classes, loading, error, refetch } = useClasses();
  const [search, setSearch] = useState("");
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Form states
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [formData, setFormData] = useState({ class_name: "", section: "nursery" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    getSectionLabel(c.section || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.class_name.trim()) return toast.error("Class name is required");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create class");
      }
      toast.success("Class created successfully");
      setIsCreateOpen(false);
      setFormData({ class_name: "", section: "nursery" });
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!formData.class_name.trim()) return toast.error("Class name is required");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/classes/${selectedClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update class");
      }
      toast.success("Class updated successfully");
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
      const res = await fetch(`${API_BASE}/classes/${selectedClass.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete class");
      }
      toast.success("Class deleted successfully");
      setIsDeleteOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (cls: any) => {
    setSelectedClass(cls);
    setFormData({ class_name: cls.name, section: cls.section || "nursery" });
    setIsEditOpen(true);
  };

  const openDelete = (cls: any) => {
    setSelectedClass(cls);
    setIsDeleteOpen(true);
  };

  return (
    <div className="pb-12">
      <HeroSection
        title="Classes Management"
        subtitle={`${classes.length} classes configured`}
        actions={
          <Button
            className="bg-[#065F46] hover:bg-[#047857] text-white shadow-md shadow-[#065F46]/20 transition-all rounded-xl"
            onClick={() => {
              setFormData({ class_name: "", section: "nursery" });
              setIsCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Class
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search classes..." 
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
          empty={!loading && !error && filteredClasses.length === 0} 
          emptyTitle="No classes found" 
          emptyMessage={search ? "Try adjusting your search query." : "Add your first class to get started."}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence>
              {filteredClasses.map((cls, idx) => (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:border-[#065F46]/30 hover:shadow-lg hover:shadow-[#065F46]/5 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#065F46] to-[#F97316] opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#065F46]">
                        <BookMarked className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{cls.name}</h3>
                        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getSectionColor(cls.section || "")}`}>
                          {getSectionLabel(cls.section || "")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cls)} className="h-8 w-8 text-gray-500 hover:text-[#065F46] hover:bg-[#065F46]/10 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDelete(cls)} className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
            <DialogTitle>Add New Class</DialogTitle>
            <DialogDescription>Create a new class for the system.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Class Name</Label>
              <Input 
                value={formData.class_name} 
                onChange={e => setFormData({ ...formData, class_name: e.target.value })} 
                placeholder="e.g., P1, Middle"
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
            <Button onClick={handleCreate} disabled={isSubmitting} className="rounded-xl bg-[#065F46] hover:bg-[#047857]">
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
            <DialogTitle className="text-red-600">Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-bold text-gray-900">{selectedClass?.name}</span>? This action cannot be undone.
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
