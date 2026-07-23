"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, Edit, Trash2, ChevronDown, UserX } from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import { AnimatedButton } from "@/components/AnimatedButton";
import { createClient } from "@/utils/supabase/client";
import { escapeHtml } from "@/lib/sanitize";
import { toast } from "sonner";

export type DashboardTeacher = {
  id: string;
  name: string;
  role: string;
  subject: string;
  classes: string[];
  email: string;
  phone: string;
  status: string;
  joined: string;
};

const teacherFormSchema = z.object({
  full_name: z.string().min(2, "Please enter a valid full name."),
  email: z.string().email("Please enter a valid email address (e.g., name@school.edu).").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  role: z.string().min(1, "Please select a role for this faculty member."),
  subject_specialization: z.string().optional().or(z.literal("")),
  class_assigned: z.string().optional().or(z.literal("")),
});

type TeacherForm = z.infer<typeof teacherFormSchema>;

const defaultTeacherFormValues: TeacherForm = {
  full_name: '',
  email: '',
  phone: '',
  role: '',
  subject_specialization: '',
  class_assigned: '',
};

const statusBadgeStyle = (status: string) => {
  switch (status) {
    case 'active':
      return { background: 'rgba(16,185,129,0.12)', color: '#065F46' }
    case 'on_leave':
      return { background: 'rgba(245,158,11,0.12)', color: '#92400E' }
    default:
      return { background: 'rgba(239,68,68,0.12)', color: '#B91C1C' }
  }
}

const roleBadgeStyle = (role: string) => {
  switch (role) {
    case 'Class Teacher':
    case 'Teacher':
    case 'DOS':
      return { background: 'rgba(16,185,129,0.12)', color: '#065F46' }
    case 'Deputy Head Teacher':
    case 'Support Staff':
      return { background: 'rgba(107,114,128,0.12)', color: '#374151' }
    default:
      return { background: 'rgba(229,231,235,0.45)', color: '#4B5563' }
  }
}

const maskValue = (value: string | undefined) => {
  if (!value) return 'Not provided'
  if (value.includes('@')) {
    const [local, domain] = value.split('@')
    return `${local.slice(0, 2)}...@${domain}`
  }
  return value.length > 6 ? `${value.slice(0, 3)}...${value.slice(-3)}` : value
}

// Avatar color hashing
function avatarColors(name: string) {
  const palettes = [
    'bg-emerald-100 text-emerald-700',
    'bg-orange-100 text-orange-700',
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
}

export default function TeachersClient({ 
  initialTeachers, 
  currentUserRole,
  currentUserSubject
}: { 
  initialTeachers: DashboardTeacher[];
  currentUserRole?: string;
  currentUserSubject?: string;
}) {
  const [teachers, setTeachers] = useState<DashboardTeacher[]>(initialTeachers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<DashboardTeacher | null>(null);



  const addTeacherForm = useForm<TeacherForm>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: defaultTeacherFormValues,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = addTeacherForm;

  const filteredTeachers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return teachers.filter((teacher) => {
      const matchesSearch =
        !normalizedSearch ||
        teacher.name.toLowerCase().includes(normalizedSearch) ||
        teacher.role.toLowerCase().includes(normalizedSearch) ||
        teacher.subject.toLowerCase().includes(normalizedSearch);
      const matchesRole = roleFilter === 'All Roles' || teacher.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [teachers, roleFilter, searchQuery]);

  const refetch = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('teachers').select('*').order('name');
    if (data) {
      const formatted = data.map((t: any) => ({
        id: t.id,
        name: t.name || '',
        role: t.role || '',
        subject: t.subject || '',
        classes: typeof t.classes === 'string' ? t.classes.split(',').map((c: string) => c.trim()).filter(Boolean) : (t.classes || []),
        email: t.email || '',
        phone: t.phone || '',
        status: t.status || 'active',
        joined: t.created_at || ''
      }));
      setTeachers(formatted);
    }
  };

  const openFormModal = () => {
    setSelectedTeacher(null);
    reset(defaultTeacherFormValues);
    setShowFormModal(true);
  };

  const openEditModal = (teacher: DashboardTeacher) => {
    setSelectedTeacher(teacher);
    reset({
      full_name: teacher.name,
      email: teacher.email ?? '',
      phone: teacher.phone ?? '',
      role: teacher.role as TeacherForm['role'],
      subject_specialization: teacher.subject ?? '',
      class_assigned: teacher.classes.join(', '),
    });
    setShowFormModal(true);
  };

  const closeModal = () => {
    setSelectedTeacher(null);
    reset(defaultTeacherFormValues);
    setShowFormModal(false);
  };

  const handleSaveTeacher = async (values: TeacherForm) => {
    try {
      if (selectedTeacher) {
        const supabase = createClient();
        const payload = {
          name: values.full_name,
          role: values.role,
          email: values.email || null,
          phone: values.phone || null,
          subject: values.subject_specialization || null,
          classes: values.class_assigned ? values.class_assigned.split(',').map(s => s.trim()) : [],
          status: 'active'
        };
        const response = await fetch(`/api/admin/teachers/${selectedTeacher.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update teacher');
        toast.success("Teacher updated successfully!");
      } else {
        const response = await fetch('/api/admin/teachers/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.full_name,
            role: values.role,
            email: values.email,
            phone: values.phone,
            subject: values.subject_specialization,
            classes: values.class_assigned ? values.class_assigned.split(',').map(s => s.trim()) : []
          })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create invite');
        }
        toast.success('Invite created successfully!', { description: 'The teacher can now register.' });
      }
      
      await refetch();
      closeModal();
    } catch (err: any) {
      toast.error('Failed to save teacher', { description: err.message });
    }
  };

  const handleDeactivate = async (teacher: DashboardTeacher) => {
    const confirmed = window.confirm(`Are you sure you want to deactivate ${teacher.name}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/teachers/${teacher.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete teacher');
      await refetch();
      toast.success("Teacher deactivated successfully");
    } catch (err: any) {
      toast.error('Failed to deactivate teacher', { description: err.message });
    }
  };

  return (
    <div className="pb-12 w-full">
      <HeroSection
        title="Teachers & Staff"
        subtitle={`${teachers.length} teachers and staff currently registered`}
        actions={
          <AnimatedButton
            type="button"
            onClick={openFormModal}
            className="flex items-center gap-2 rounded-xl bg-[#10B981] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="w-4 h-4" /> Add Teacher
          </AnimatedButton>
        }
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, role or subject..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm text-slate-700 outline-none focus:border-[#10B981] transition-colors"
            />
          </div>
          <div className="relative w-full max-w-xs">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none appearance-none focus:border-[#10B981] transition-colors"
            >
              <option>All Roles</option>
              <option>Administrator</option>
              <option>DOS</option>
              <option>Class Teacher</option>
              <option>Teacher</option>
              <option>Support Staff</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
              <UserX size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">{teachers.length === 0 ? 'No teachers yet' : 'No results found'}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {teachers.length === 0 ? 'Add your first teacher using the button above.' : 'Try a different search term or role.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTeachers.map((teacher) => (
              <div key={teacher.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 ${avatarColors(teacher.name)}`}>
                      <span className="text-base font-bold">
                        {teacher.name
                          .split(' ')
                          .filter((word) => !['Mr.', 'Mrs.', 'Miss', 'Mallam', 'Ustaz', 'Ustazah'].includes(word))
                          .map((word) => word[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{escapeHtml(teacher.name)}</p>
                      <p className="mt-1 text-xs text-slate-500 truncate">{escapeHtml(teacher.subject) || 'No subject'}</p>
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 whitespace-nowrap"
                    style={roleBadgeStyle(teacher.role)}
                  >
                    {escapeHtml(teacher.role)}
                  </span>
                </div>

                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Email</span>
                    <span>{escapeHtml(maskValue(teacher.email))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Phone</span>
                    <span>{escapeHtml(maskValue(teacher.phone))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Class</span>
                    <span className="truncate ml-2">{escapeHtml(teacher.classes.join(', ') || 'Unassigned')}</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={statusBadgeStyle(teacher.status)}
                  >
                    {teacher.status === 'active'
                      ? 'Active'
                      : teacher.status === 'on_leave'
                      ? 'On leave'
                      : 'Inactive'}
                  </span>
                  <div className="flex items-center gap-2">
                    <AnimatedButton
                      type="button"
                      onClick={() => openEditModal(teacher)}
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <Edit className="mr-1 inline-block h-3.5 w-3.5" /> Edit
                    </AnimatedButton>
                    <AnimatedButton
                      type="button"
                      onClick={() => handleDeactivate(teacher)}
                      className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="mr-1 inline-block h-3.5 w-3.5" /> Delete
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-xl max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 p-6 shrink-0">
              <div>
                <p className="text-sm font-semibold text-slate-500">{selectedTeacher ? 'Edit teacher details' : 'Add a new teacher'}</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {selectedTeacher ? escapeHtml(selectedTeacher.name) : 'Teacher details'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form noValidate onSubmit={handleSubmit(handleSaveTeacher)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    {...register('full_name')}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#10B981]"
                  />
                  {errors.full_name && <p className="mt-2 text-xs text-rose-600">{errors.full_name.message}</p>}
                </div>
                {currentUserRole === 'admin' ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
                    <div className="relative">
                      <select
                        {...register('role')}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none appearance-none focus:border-[#10B981]"
                      >
                        <option value="Administrator">Administrator</option>
                        <option value="DOS">DOS</option>
                        <option value="Class Teacher">Class Teacher</option>
                        <option value="Teacher">Teacher</option>
                        <option value="Support Staff">Support Staff</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {errors.role && <p className="mt-2 text-xs text-rose-600">{errors.role.message}</p>}
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
                    <div className="relative">
                      <select
                        {...register('role')}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none appearance-none focus:border-[#10B981]"
                      >
                        <option value="" disabled>Select a role...</option>
                        {currentUserRole === 'DOS Secular' ? (
                          <option value="Class Teacher">Class Teacher</option>
                        ) : currentUserRole === 'DOS Theology' ? (
                          <option value="Theology Instructor">Theology Instructor</option>
                        ) : (
                          <>
                            <option value="Class Teacher">Class Teacher</option>
                            <option value="Theology Instructor">Theology Instructor</option>
                            <option value="Support Staff">Support Staff</option>
                          </>
                        )}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {errors.role && <p className="mt-2 text-xs text-rose-600">{errors.role.message}</p>}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#10B981]"
                  />
                  {errors.email && <p className="mt-2 text-xs text-rose-600">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
                  <input
                    type="text"
                    {...register('phone')}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#10B981]"
                  />
                  {errors.phone && <p className="mt-2 text-xs text-rose-600">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {currentUserRole === 'admin' ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Scope (Department / Track)</label>
                    <div className="relative">
                      <select
                        {...register('subject_specialization')}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none appearance-none focus:border-[#10B981]"
                      >
                        <option value="">None / Unassigned</option>
                        <option value="Secular">Secular</option>
                        <option value="Theology">Theology</option>
                        <option value="Administration">Administration</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {errors.subject_specialization && (
                      <p className="mt-2 text-xs text-rose-600">{errors.subject_specialization.message}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Scope (Department / Track)</label>
                    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Inviting into: {currentUserSubject || 'Your Department'}
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Class Assigned (comma separated)</label>
                  <input
                    type="text"
                    {...register('class_assigned')}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#10B981]"
                  />
                  {errors.class_assigned && <p className="mt-2 text-xs text-rose-600">{errors.class_assigned.message}</p>}
                </div>
              </div>

                <div className="flex flex-col gap-3 pt-4 sm:flex-row border-t border-slate-100 mt-4">
                  <AnimatedButton
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-2xl bg-[#10B981] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Saving...' : selectedTeacher ? 'Update Teacher' : 'Add Teacher'}
                  </AnimatedButton>
                  <AnimatedButton
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </AnimatedButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
