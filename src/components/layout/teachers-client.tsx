"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, Edit, Trash2, ChevronDown, UserX } from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import { AnimatedButton } from "@/components/AnimatedButton";
import { createClient } from "@/utils/supabase/client";
import { escapeHtml } from "@/lib/sanitize";
import { CANONICAL_ACCOUNT_ROLES, normalizeAccountRole } from "@/lib/teacher-access";
import { toast } from "sonner";

export type DashboardTeacher = {
  id: string;
  name: string;
  role: string;
  subject: string;
  classes: string[];
  classIds?: string[];
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
  classes_assigned: z.array(z.string()).optional(),
});

type TeacherForm = z.infer<typeof teacherFormSchema>;

const defaultTeacherFormValues: TeacherForm = {
  full_name: '',
  email: '',
  phone: '',
  role: 'Class Teacher',
  subject_specialization: 'Secular',
  classes_assigned: [],
};

const statusBadgeStyle = (status: string) => {
  switch (status) {
    case 'active':
      return { background: 'rgba(15,77,37,0.12)', color: '#0F4D25' }
    case 'on_leave':
      return { background: 'rgba(245,158,11,0.12)', color: '#92400E' }
    default:
      return { background: 'rgba(239,68,68,0.12)', color: '#B91C1C' }
  }
}

const roleBadgeStyle = (role: string) => {
  switch (role) {
    case 'Administrator':
    case 'Head Teacher':
      return { background: 'rgba(15,77,37,0.14)', color: '#0F4D25' }
    case 'DOS Secular':
    case 'DOS Theology':
      return { background: 'rgba(180,83,9,0.12)', color: '#92400E' }
    case 'Class Teacher':
      return { background: 'rgba(16,185,129,0.12)', color: '#065F46' }
    default:
      return { background: 'rgba(120,113,108,0.15)', color: '#44403C' }
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

function avatarColors(name: string) {
  const palettes = [
    'bg-emerald-100 text-emerald-800',
    'bg-amber-100 text-amber-800',
    'bg-stone-200 text-stone-800',
    'bg-orange-100 text-orange-800',
    'bg-teal-100 text-teal-800',
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

  const [circularClasses, setCircularClasses] = useState<any[]>([]);
  const [theologyClasses, setTheologyClasses] = useState<any[]>([]);

  useEffect(() => {
    const fetchClasses = async () => {
      const supabase = createClient();
      const { data: cClasses } = await supabase.from('circular_classes').select('id, class_name, section').order('class_name');
      const { data: tClasses } = await supabase.from('theology_classes').select('id, class_name_english, class_name_arabic').order('class_name_english');
      if (cClasses) setCircularClasses(cClasses);
      if (tClasses) setTheologyClasses(tClasses);
    };
    fetchClasses();
  }, []);

  const classLookup = useMemo(() => {
    const idToName = new Map<string, string>();
    const nameToId = new Map<string, string>();
    circularClasses.forEach((c) => {
      if (c?.id && c?.class_name) {
        idToName.set(c.id, c.class_name);
        nameToId.set(c.class_name.toLowerCase(), c.id);
      }
    });
    theologyClasses.forEach((t) => {
      const label = t?.class_name_english || t?.class_name_arabic;
      if (t?.id && label) {
        idToName.set(t.id, label);
        nameToId.set(label.toLowerCase(), t.id);
      }
    });
    return { idToName, nameToId };
  }, [circularClasses, theologyClasses]);

  const resolveDisplayClasses = (teacher: DashboardTeacher): string[] => {
    const raw = teacher.classes || [];
    return raw
      .map((item) => classLookup.idToName.get(item) || (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(item) ? item : null))
      .filter(Boolean) as string[];
  };

  const resolveAssignedClassIds = (teacher: DashboardTeacher): string[] => {
    if (teacher.classIds && teacher.classIds.length > 0) {
      return teacher.classIds;
    }
    return (teacher.classes || [])
      .map((item) => {
        if (classLookup.idToName.has(item)) return item;
        return classLookup.nameToId.get(item.toLowerCase()) || null;
      })
      .filter(Boolean) as string[];
  };

  const addTeacherForm = useForm<TeacherForm>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: defaultTeacherFormValues,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = addTeacherForm;

  const filteredTeachers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return teachers.filter((teacher) => {
      const displayRole = normalizeAccountRole(teacher.role, teacher.subject);
      const matchesSearch =
        !normalizedSearch ||
        teacher.name.toLowerCase().includes(normalizedSearch) ||
        displayRole.toLowerCase().includes(normalizedSearch) ||
        teacher.subject.toLowerCase().includes(normalizedSearch);
      const matchesRole = roleFilter === 'All Roles' || displayRole === roleFilter || teacher.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [teachers, roleFilter, searchQuery]);

  const refetch = async () => {
    try {
      const res = await fetch('/api/teachers');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setTeachers(
            json.data.map((t: any) => ({
              id: t.id,
              name: t.name || '',
              role: normalizeAccountRole(t.role, t.subject),
              subject: t.subject || '',
              classes: Array.isArray(t.classes) ? t.classes : [],
              classIds: Array.isArray(t.class_ids) ? t.class_ids : [],
              email: t.email || '',
              phone: t.phone || '',
              status: t.status || 'active',
              joined: t.joined || ''
            }))
          );
          return;
        }
      }
    } catch {}
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
      role: normalizeAccountRole(teacher.role, teacher.subject),
      subject_specialization: teacher.subject ?? '',
      classes_assigned: resolveAssignedClassIds(teacher),
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
        const payload = {
          name: values.full_name,
          role: values.role,
          email: values.email || null,
          phone: values.phone || null,
          subject: values.subject_specialization || null,
          classes: values.classes_assigned || [],
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
            subject: values.subject_specialization || (values.role === 'DOS Theology' ? 'Theology' : 'Secular'),
            classes: values.classes_assigned || []
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
    <div className="pb-12 w-full bg-[#FDFBF7]">
      <HeroSection
        title="Teachers & Staff"
        subtitle={`${teachers.length} faculty accounts registered across consolidated roles`}
        actions={
          <AnimatedButton
            type="button"
            onClick={openFormModal}
            className="flex items-center gap-2 rounded-xl bg-[#0F4D25] px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white"
          >
            <Plus className="w-4 h-4" /> Add Teacher
          </AnimatedButton>
        }
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, role or department..."
              className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-10 py-2.5 text-sm text-stone-800 outline-none focus:border-[#0F4D25] transition-colors"
            />
          </div>
          <div className="relative w-full max-w-xs">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              aria-label="Filter by role"
              className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 text-sm text-stone-800 outline-none appearance-none focus:border-[#0F4D25] transition-colors"
            >
              <option value="All Roles">All Roles</option>
              {CANONICAL_ACCOUNT_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          </div>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-[#E7E2D7]">
            <div className="w-14 h-14 bg-[#FAF7F2] border border-[#E7E2D7] rounded-2xl flex items-center justify-center mb-4 text-stone-400">
              <UserX size={24} />
            </div>
            <h3 className="text-sm font-bold text-stone-800">{teachers.length === 0 ? 'No teachers yet' : 'No results found'}</h3>
            <p className="mt-1 text-sm text-stone-500">
              {teachers.length === 0 ? 'Add your first teacher using the button above.' : 'Try a different search term or role.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTeachers.map((teacher) => {
              const displayRole = normalizeAccountRole(teacher.role, teacher.subject);
              const displayClasses = resolveDisplayClasses(teacher);
              return (
                <div key={teacher.id} className="rounded-2xl border border-[#E7E2D7] bg-white p-5 shadow-sm transition hover:shadow-md">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${avatarColors(teacher.name)}`}>
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
                        <p className="text-sm font-semibold text-stone-900 truncate">{escapeHtml(teacher.name)}</p>
                        <p className="mt-0.5 text-xs text-stone-500 truncate">{escapeHtml(teacher.subject) || 'General'}</p>
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 whitespace-nowrap"
                      style={roleBadgeStyle(displayRole)}
                    >
                      {escapeHtml(displayRole)}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-sm text-stone-700">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 text-xs">Email</span>
                      <span className="text-xs font-mono">{escapeHtml(maskValue(teacher.email))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 text-xs">Phone</span>
                      <span className="text-xs font-mono tabular-nums">{escapeHtml(maskValue(teacher.phone))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 text-xs">Assigned Classes</span>
                      <span className="truncate ml-2 text-xs font-semibold text-stone-900" data-testid={`teacher-classes-${teacher.id}`}>
                        {escapeHtml(displayClasses.join(', ') || 'Unassigned')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E7E2D7]">
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
                        className="rounded-xl bg-[#FAF7F2] border border-[#E7E2D7] px-3.5 py-2 min-h-[44px] text-xs font-semibold text-stone-800 hover:bg-[#F3EFE6] transition-colors flex items-center gap-1.5"
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </AnimatedButton>
                      <AnimatedButton
                        type="button"
                        onClick={() => handleDeactivate(teacher)}
                        aria-label={`Deactivate ${teacher.name}`}
                        className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2 min-h-[44px] text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Deactivate
                      </AnimatedButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-[#E7E2D7] shadow-xl max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between border-b border-[#E7E2D7] p-6 shrink-0">
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{selectedTeacher ? 'Edit teacher details' : 'Add a new teacher'}</p>
                <h2 className="mt-1 text-xl font-bold text-stone-900">
                  {selectedTeacher ? escapeHtml(selectedTeacher.name) : 'Teacher Account Details'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl bg-[#FAF7F2] min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-600 transition hover:bg-[#F3EFE6]"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form noValidate onSubmit={handleSubmit(handleSaveTeacher)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">Full Name</label>
                    <input
                      type="text"
                      {...register('full_name')}
                      className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#0F4D25]"
                    />
                    {errors.full_name && <p className="mt-1.5 text-xs text-rose-600">{errors.full_name.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">Account Role</label>
                    <div className="relative">
                      <select
                        {...register('role')}
                        className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 pr-10 text-sm text-stone-900 outline-none appearance-none focus:border-[#0F4D25]"
                      >
                        {currentUserRole === 'admin' ? (
                          CANONICAL_ACCOUNT_ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))
                        ) : (
                          <option value="Class Teacher">Class Teacher</option>
                        )}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    </div>
                    {errors.role && <p className="mt-1.5 text-xs text-rose-600">{errors.role.message}</p>}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">Email</label>
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#0F4D25]"
                    />
                    {errors.email && <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">Phone</label>
                    <input
                      type="text"
                      {...register('phone')}
                      className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#0F4D25]"
                    />
                    {errors.phone && <p className="mt-1.5 text-xs text-rose-600">{errors.phone.message}</p>}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {currentUserRole === 'admin' ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">Scope (Department / Track)</label>
                      <div className="relative">
                        <select
                          {...register('subject_specialization')}
                          className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 pr-10 text-sm text-stone-900 outline-none appearance-none focus:border-[#0F4D25]"
                        >
                          <option value="Secular">Secular</option>
                          <option value="Theology">Theology</option>
                          <option value="Administration">Administration</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                      </div>
                      {errors.subject_specialization && (
                        <p className="mt-1.5 text-xs text-rose-600">{errors.subject_specialization.message}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">Scope (Department / Track)</label>
                      <div className="w-full min-h-[44px] flex items-center rounded-xl border border-[#E7E2D7] bg-[#FAF7F2] px-4 py-2.5 text-sm text-stone-600">
                        Inviting into: {currentUserSubject || 'Your Department'}
                      </div>
                    </div>
                  )}
                  <div className="col-span-full">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">Classes Assigned (Check all that apply)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto p-4 border border-[#E7E2D7] rounded-xl bg-[#FAF7F2]">
                      <div>
                        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Secular Classes</h4>
                        <div className="space-y-2">
                          {circularClasses.map(c => (
                            <label key={c.id} className="flex items-center gap-2.5 min-h-[36px] cursor-pointer group">
                              <input
                                type="checkbox"
                                value={c.id}
                                {...register('classes_assigned')}
                                className="w-4 h-4 rounded border-stone-300 text-[#0F4D25] focus:ring-[#0F4D25]"
                              />
                              <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
                                {c.class_name} {c.section ? `(${c.section})` : ''}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Theology Classes</h4>
                        <div className="space-y-2">
                          {theologyClasses.map(t => (
                            <label key={t.id} className="flex items-center gap-2.5 min-h-[36px] cursor-pointer group">
                              <input
                                type="checkbox"
                                value={t.id}
                                {...register('classes_assigned')}
                                className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
                                {t.class_name_english || t.class_name_arabic}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    {errors.classes_assigned && (
                      <p className="mt-1.5 text-xs text-rose-600">{errors.classes_assigned.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 sm:flex-row border-t border-[#E7E2D7] mt-4">
                  <AnimatedButton
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 min-h-[44px] rounded-xl bg-[#0F4D25] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Saving...' : selectedTeacher ? 'Update Teacher' : 'Add Teacher'}
                  </AnimatedButton>
                  <AnimatedButton
                    type="button"
                    onClick={closeModal}
                    className="flex-1 min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-[#FAF7F2]"
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
