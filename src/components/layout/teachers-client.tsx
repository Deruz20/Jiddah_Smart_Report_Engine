"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  UserX,
  UserCheck,
  Shield,
  KeyRound,
  Check,
  RefreshCw,
  Users,
} from "lucide-react";
import { MoreActionsMenu } from "@/components/ui/more-actions-menu";
import { CustomPillSelect } from "@/components/ui/custom-pill-select";
import { HeroSection } from "@/components/HeroSection";
import { AnimatedButton } from "@/components/AnimatedButton";
import { ConfirmDestructiveDialog } from "@/components/ConfirmDestructiveDialog";
import { createClient } from "@/utils/supabase/client";
import { escapeHtml } from "@/lib/sanitize";
import {
  CANONICAL_ACCOUNT_ROLES,
  ALL_STAFF_ROLES,
  PERMISSION_KEYS,
  PERMISSION_METADATA,
  DEFAULT_ROLE_PERMISSIONS,
  normalizeAccountRole,
  resolveStaffRoleKey,
  type PermissionKey,
  type StaffRoleName,
} from "@/lib/teacher-access";
import { mapClassesToSections } from "@/lib/academic-sections";
import { toast } from "sonner";

export type DashboardTeacher = {
  id: string;
  name: string;
  role: string;
  rawRole?: string;
  subject: string;
  classes: string[];
  classIds?: string[];
  email: string;
  username?: string;
  phone: string;
  status: string;
  joined: string;
  permissions?: string[];
};

const teacherFormSchema = z.object({
  full_name: z.string().min(2, "Please enter a valid full name."),
  email: z.string().email("Please enter a valid email address (e.g., name@school.edu)."),
  username: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (!v.includes("@") && /^[a-zA-Z0-9._-]{2,64}$/.test(v)),
      "Username must be 2–64 letters, numbers, dots, underscores, or hyphens (no @)."
    )
    .optional()
    .or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  role: z.string().min(1, "Please select a role for this faculty member."),
  subject_specialization: z.string().optional().or(z.literal("")),
  classes_assigned: z.array(z.string()).optional(),
  creation_mode: z.enum(["direct", "invite"]).optional(),
  initial_password: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).optional(),
  permissions: z.array(z.string()).optional(),
});

type TeacherForm = z.infer<typeof teacherFormSchema>;

const defaultTeacherFormValues: TeacherForm = {
  full_name: "",
  email: "",
  username: "",
  phone: "",
  role: "Class Teacher",
  subject_specialization: "Secular",
  classes_assigned: [],
  creation_mode: "direct",
  initial_password: "",
  status: "active",
  permissions: [],
};

const statusBadgeStyle = (status: string) => {
  switch (status) {
    case "active":
      return { background: "rgba(15,77,37,0.12)", color: "#0F4D25" };
    case "on_leave":
      return { background: "rgba(245,158,11,0.12)", color: "#92400E" };
    default:
      return { background: "rgba(239,68,68,0.12)", color: "#B91C1C" };
  }
};

const roleBadgeStyle = (role: string) => {
  switch (role) {
    case "Administrator":
    case "Principal":
    case "Head Teacher":
    case "Deputy Head Teacher":
      return { background: "rgba(15,77,37,0.14)", color: "#0F4D25" };
    case "DOS Secular":
    case "DOS Theology":
      return { background: "rgba(180,83,9,0.12)", color: "#92400E" };
    case "Class Teacher":
    case "Theology Instructor":
      return { background: "rgba(16,185,129,0.12)", color: "#065F46" };
    default:
      return { background: "rgba(120,113,108,0.15)", color: "#44403C" };
  }
};

function avatarColors(name: string) {
  const palettes = [
    "bg-emerald-100 text-emerald-800",
    "bg-amber-100 text-amber-800",
    "bg-stone-200 text-stone-800",
    "bg-orange-100 text-orange-800",
    "bg-teal-100 text-teal-800",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
}

export default function TeachersClient({
  initialTeachers,
  currentUserRole,
  currentUserSubject,
  initialRolePermissions,
}: {
  initialTeachers: DashboardTeacher[];
  currentUserRole?: string;
  currentUserSubject?: string;
  initialRolePermissions?: Record<string, PermissionKey[]>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"users" | "permissions">("users");
  const [teachers, setTeachers] = useState<DashboardTeacher[]>(initialTeachers);
  const [searchQuery, setSearchQuery] = useState(() => searchParams?.get("search") || "");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const roleFilterOptions = useMemo(
    () => [
      { value: "All Roles", label: "All Roles" },
      ...ALL_STAFF_ROLES.map((r) => ({ value: r, label: r })),
      { value: "Subject Teacher", label: "Subject Teacher" },
    ],
    []
  );

  const departmentFilterOptions = useMemo(
    () => [
      { value: "All Departments", label: "All Departments" },
      { value: "Secular", label: "Secular" },
      { value: "Theology", label: "Theology" },
      { value: "Both", label: "Both (Secular & Theology)" },
      { value: "Administration", label: "Administration" },
    ],
    []
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "All Statuses", label: "All Statuses" },
      { value: "active", label: "Active Only" },
      { value: "inactive", label: "Inactive Only" },
    ],
    []
  );

  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<DashboardTeacher | null>(null);
  const [teacherToDeactivate, setTeacherToDeactivate] = useState<DashboardTeacher | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Admin Reset Password modal state
  const [teacherToResetPwd, setTeacherToResetPwd] = useState<DashboardTeacher | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  // Role Permissions Editor state
  const [rolePermissions, setRolePermissions] = useState<Record<string, PermissionKey[]>>(
    () => initialRolePermissions || { ...DEFAULT_ROLE_PERMISSIONS }
  );
  const [savingRoleKey, setSavingRoleKey] = useState<string | null>(null);

  const [circularClasses, setCircularClasses] = useState<any[]>([]);
  const [theologyClasses, setTheologyClasses] = useState<any[]>([]);

  useEffect(() => {
    const q = searchParams?.get("search");
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchClasses = async () => {
      const supabase = createClient();
      const { data: cClasses } = await supabase
        .from("circular_classes")
        .select("id, class_name, section")
        .order("class_name");
      const { data: tClasses } = await supabase
        .from("theology_classes")
        .select("id, class_name_english, class_name_arabic")
        .order("class_name_english");
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
    const roleKey = resolveStaffRoleKey(teacher.rawRole || teacher.role, teacher.subject);
    if (
      roleKey === "Administrator" ||
      roleKey === "Principal" ||
      roleKey === "Head Teacher" ||
      roleKey === "Deputy Head Teacher"
    ) {
      return ["All classes"];
    }
    const raw = teacher.classes || [];
    return raw
      .map(
        (item) =>
          classLookup.idToName.get(item) ||
          (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(item) ? item : null)
      )
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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = addTeacherForm;

  const watchedCreationMode = watch("creation_mode") || "direct";
  const watchedPermissions = watch("permissions") || [];
  const watchedRole = watch("role") || "Class Teacher";
  const watchedDepartment = watch("subject_specialization") || "Secular";
  const watchedClassesAssigned = watch("classes_assigned") || [];

  const resolvedModalRoleKey = useMemo(
    () => resolveStaffRoleKey(watchedRole, watchedDepartment),
    [watchedRole, watchedDepartment]
  );

  const isSchoolWideRole =
    watchedRole === "Administrator" ||
    watchedRole === "Principal" ||
    watchedRole === "Head Teacher" ||
    watchedRole === "Deputy Head Teacher";

  const isDepartmentWideDOSRole =
    watchedRole === "DOS Secular" || watchedRole === "DOS Theology";

  const effectiveModalDepartment = useMemo(() => {
    if (isSchoolWideRole) return "Both";
    if (watchedRole === "DOS Secular") return "Secular";
    if (watchedRole === "DOS Theology" || watchedRole === "Theology Instructor") return "Theology";
    return watchedDepartment || "Secular";
  }, [isSchoolWideRole, watchedRole, watchedDepartment]);

  const roleDefaultPermissionKeys = useMemo<PermissionKey[]>(() => {
    if (resolvedModalRoleKey === "Administrator") {
      return [...PERMISSION_KEYS];
    }
    return (
      rolePermissions[resolvedModalRoleKey] ||
      DEFAULT_ROLE_PERMISSIONS[resolvedModalRoleKey] ||
      []
    );
  }, [resolvedModalRoleKey, rolePermissions]);

  const groupedCircularClasses = useMemo(() => {
    const mapped = mapClassesToSections(circularClasses, "secular");
    const unmappedIds = new Set(mapped.unmappedClasses.map((u) => u.id));
    return {
      nursery: mapped.bySection.nursery,
      lower_primary: mapped.bySection.lower_primary,
      upper_primary: mapped.bySection.upper_primary,
      other: circularClasses.filter((c) => unmappedIds.has(String(c.id))),
    };
  }, [circularClasses]);

  const groupedTheologyClasses = useMemo(() => {
    const mapped = mapClassesToSections(theologyClasses, "theology");
    const unmappedIds = new Set(mapped.unmappedClasses.map((u) => u.id));
    return {
      nursery: mapped.bySection.nursery,
      lower_primary: mapped.bySection.lower_primary,
      upper_primary: mapped.bySection.upper_primary,
      other: theologyClasses.filter((t) => unmappedIds.has(String(t.id))),
    };
  }, [theologyClasses]);

  const toggleClassIdSelection = (classId: string, checked: boolean) => {
    const current = Array.isArray(watchedClassesAssigned) ? watchedClassesAssigned : [];
    const next = checked
      ? Array.from(new Set([...current, classId]))
      : current.filter((id) => id !== classId);
    setValue("classes_assigned", next, { shouldDirty: true });
  };

  const filteredTeachers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return teachers.filter((teacher) => {
      const staffRole = resolveStaffRoleKey(teacher.rawRole || teacher.role, teacher.subject);
      const displayRole = normalizeAccountRole(teacher.rawRole || teacher.role, teacher.subject);
      const matchesSearch =
        !normalizedSearch ||
        teacher.name.toLowerCase().includes(normalizedSearch) ||
        (teacher.email && teacher.email.toLowerCase().includes(normalizedSearch)) ||
        (teacher.username && teacher.username.toLowerCase().includes(normalizedSearch)) ||
        staffRole.toLowerCase().includes(normalizedSearch) ||
        displayRole.toLowerCase().includes(normalizedSearch) ||
        teacher.subject.toLowerCase().includes(normalizedSearch);
      const matchesRole =
        roleFilter === "All Roles" ||
        staffRole === roleFilter ||
        displayRole === roleFilter ||
        teacher.role === roleFilter ||
        teacher.rawRole === roleFilter;
      const matchesDept =
        departmentFilter === "All Departments" ||
        (teacher.subject || "").toLowerCase().includes(departmentFilter.toLowerCase());
      const matchesStatus =
        statusFilter === "All Statuses" || (teacher.status || "active") === statusFilter;
      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [teachers, roleFilter, departmentFilter, statusFilter, searchQuery]);

  const refetch = async () => {
    try {
      const res = await fetch("/api/teachers", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setTeachers(
            json.data.map((t: any) => ({
              id: t.id,
              name: t.name || "",
              role: normalizeAccountRole(t.raw_role || t.role, t.subject),
              rawRole: t.raw_role || t.role || "",
              subject: t.subject || "",
              classes: Array.isArray(t.classes) ? t.classes : [],
              classIds: Array.isArray(t.class_ids) ? t.class_ids : [],
              email: t.email || "",
              username: t.username || "",
              phone: t.phone || "",
              status: t.status || "active",
              joined: t.joined || "",
              permissions: Array.isArray(t.permissions) ? t.permissions : [],
            }))
          );
          return;
        }
      }
    } catch {}
  };

  const openFormModal = (presetRole?: string) => {
    setSelectedTeacher(null);
    if (presetRole === "Principal") {
      reset({
        ...defaultTeacherFormValues,
        role: "Principal",
        subject_specialization: "Both",
        classes_assigned: [],
        permissions: [],
      });
    } else {
      reset(defaultTeacherFormValues);
    }
    setShowFormModal(true);
  };

  const openEditModal = (teacher: DashboardTeacher) => {
    setSelectedTeacher(teacher);
    const staffRole = resolveStaffRoleKey(teacher.rawRole || teacher.role, teacher.subject);
    reset({
      full_name: teacher.name,
      email: teacher.email ?? "",
      username: teacher.username ?? "",
      phone: teacher.phone ?? "",
      role: staffRole,
      subject_specialization: teacher.subject || "Secular",
      classes_assigned: resolveAssignedClassIds(teacher),
      creation_mode: "direct",
      initial_password: "",
      status: teacher.status === "inactive" ? "inactive" : "active",
      permissions: Array.isArray(teacher.permissions) ? teacher.permissions : [],
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
          username: values.username?.trim() || undefined,
          phone: values.phone || null,
          subject: values.subject_specialization || null,
          classes: values.classes_assigned || [],
          status: values.status || selectedTeacher.status || "active",
          permissions: values.permissions && values.permissions.length > 0 ? values.permissions : null,
        };
        const response = await fetch(`/api/admin/teachers/${selectedTeacher.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to update teacher");
        toast.success("Teacher updated and verified!");
      } else {
        if (values.creation_mode === "direct") {
          if (!values.initial_password || values.initial_password.trim().length < 8) {
            toast.error("Initial password must be at least 8 characters long.");
            return;
          }
        }
        const response = await fetch("/api/admin/teachers/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.full_name,
            role: values.role,
            email: values.email,
            username: values.username?.trim() || undefined,
            phone: values.phone,
            subject:
              values.subject_specialization ||
              (values.role === "DOS Theology" || values.role === "Theology Instructor"
                ? "Theology"
                : values.role === "Principal" || values.role === "Head Teacher"
                ? "Both"
                : "Secular"),
            classes: values.classes_assigned || [],
            password:
              values.creation_mode === "direct" ? values.initial_password?.trim() : undefined,
            permissions:
              values.permissions && values.permissions.length > 0 ? values.permissions : undefined,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to create staff account");
        }
        if (result.createdAccount) {
          toast.success("Staff account created and active!", {
            description: "The user can sign in immediately with their initial password.",
          });
        } else {
          toast.success("Invite created successfully!", {
            description: "The teacher can now register.",
          });
        }
      }

      await refetch();
      router.refresh();
      closeModal();
    } catch (err: any) {
      toast.error("Failed to save teacher", { description: err.message });
    }
  };

  const handleDeactivate = (teacher: DashboardTeacher) => {
    setTeacherToDeactivate(teacher);
  };

  const confirmDeactivate = async () => {
    if (!teacherToDeactivate) return;
    setDeactivating(true);
    try {
      const response = await fetch(`/api/admin/teachers/${teacherToDeactivate.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to deactivate teacher");
      await refetch();
      router.refresh();
      toast.success("Teacher deactivated successfully");
      setTeacherToDeactivate(null);
    } catch (err: any) {
      toast.error("Failed to deactivate teacher", { description: err.message });
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async (teacher: DashboardTeacher) => {
    try {
      const response = await fetch(`/api/admin/teachers/${teacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to reactivate teacher");
      await refetch();
      router.refresh();
      toast.success(`${teacher.name} reactivated successfully.`);
    } catch (err: any) {
      toast.error("Failed to reactivate teacher", { description: err.message });
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherToResetPwd) return;
    if (resetNewPassword.trim().length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (resetNewPassword.trim() !== resetConfirmPassword.trim()) {
      toast.error("Passwords do not match.");
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: teacherToResetPwd.id,
          email: teacherToResetPwd.email,
          newPassword: resetNewPassword.trim(),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to reset password");
      toast.success(`Password updated for ${teacherToResetPwd.name}.`);
      setTeacherToResetPwd(null);
      setResetNewPassword("");
      setResetConfirmPassword("");
    } catch (err: any) {
      toast.error("Password reset failed", { description: err.message });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleToggleRolePermission = (role: StaffRoleName, key: PermissionKey) => {
    if (role === "Administrator") return;
    setRolePermissions((prev) => {
      const current = prev[role] || [];
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      return { ...prev, [role]: next };
    });
  };

  const handleSaveRolePermissions = async (role: StaffRoleName) => {
    setSavingRoleKey(role);
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          permissions: rolePermissions[role] || [],
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to save role permissions");
      if (payload?.data?.permissions) {
        setRolePermissions((prev) => ({
          ...prev,
          [role]: payload.data.permissions,
        }));
      }
      toast.success(`Saved & enforced default permissions for ${role}.`);
      router.refresh();
    } catch (err: any) {
      toast.error(`Failed to save permissions for ${role}`, { description: err.message });
    } finally {
      setSavingRoleKey(null);
    }
  };

  return (
    <div className="pb-12 w-full bg-[#FDFBF7]">
      <HeroSection
        title="Users, Permissions & Access Management"
        subtitle={`${teachers.length} faculty accounts registered across canonical roles`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AnimatedButton
              type="button"
              data-testid="quick-create-principal-btn"
              onClick={() => openFormModal("Principal")}
              className="flex items-center gap-2 rounded-xl border border-[#E7E2D7] bg-white hover:bg-[#FAF7F2] px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-[#0F4D25] shadow-2xs"
            >
              <Shield className="w-4 h-4 text-[#0F4D25]" /> + Principal Account
            </AnimatedButton>
            <AnimatedButton
              type="button"
              onClick={() => openFormModal()}
              className="flex items-center gap-2 rounded-xl bg-[#0F4D25] px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white"
            >
              <Plus className="w-4 h-4" /> Add Teacher
            </AnimatedButton>
          </div>
        }
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 mt-6">
        {/* Top-Level Tab Switcher: Users & Access vs Roles & Permissions Matrix */}
        <div className="flex items-center gap-2 border-b border-[#E7E2D7] mb-6">
          <button
            type="button"
            data-testid="tab-users-access"
            onClick={() => setActiveTab("users")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-[#0F4D25] text-[#0F4D25]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & Access Directory ({teachers.length})</span>
          </button>
          <button
            type="button"
            data-testid="tab-roles-permissions"
            onClick={() => setActiveTab("permissions")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "permissions"
                ? "border-[#0F4D25] text-[#0F4D25]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Roles & Permissions Matrix</span>
          </button>
        </div>

        {activeTab === "users" ? (
          <>
            <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, email, role or department..."
                  className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-10 py-2.5 text-sm text-stone-800 outline-none focus:border-[#0F4D25] transition-colors"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-48 shrink-0">
                  <CustomPillSelect
                    id="teachers-role-filter"
                    ariaLabel="Filter by role"
                    value={roleFilter}
                    onChange={(val) => setRoleFilter(val)}
                    options={roleFilterOptions}
                    className="w-full min-h-[44px] rounded-xl"
                  />
                </div>
                <div className="w-48 shrink-0">
                  <CustomPillSelect
                    id="teachers-department-filter"
                    ariaLabel="Filter by department"
                    value={departmentFilter}
                    onChange={(val) => setDepartmentFilter(val)}
                    options={departmentFilterOptions}
                    className="w-full min-h-[44px] rounded-xl"
                  />
                </div>
                <div className="w-40 shrink-0">
                  <CustomPillSelect
                    id="teachers-status-filter"
                    ariaLabel="Filter by status"
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={statusFilterOptions}
                    className="w-full min-h-[44px] rounded-xl"
                  />
                </div>
              </div>
            </div>

            {filteredTeachers.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-[#E7E2D7]">
                <div className="w-14 h-14 bg-[#FAF7F2] border border-[#E7E2D7] rounded-2xl flex items-center justify-center mb-4 text-stone-400">
                  <UserX size={24} />
                </div>
                <h3 className="text-sm font-bold text-stone-800">
                  {teachers.length === 0 ? "No teachers yet" : "No results found"}
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  {teachers.length === 0
                    ? "Add your first teacher using the button above."
                    : "Try a different search term, role, or department filter."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredTeachers.map((teacher) => {
                  const displayRole = resolveStaffRoleKey(
                    teacher.rawRole || teacher.role,
                    teacher.subject
                  );
                  const displayClasses = resolveDisplayClasses(teacher);
                  return (
                    <div
                      key={teacher.id}
                      className="rounded-2xl border border-[#E7E2D7] bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${avatarColors(
                              teacher.name
                            )}`}
                          >
                            <span className="text-base font-bold">
                              {teacher.name
                                .split(" ")
                                .filter(
                                  (word) =>
                                    !["Mr.", "Mrs.", "Miss", "Mallam", "Ustaz", "Ustazah"].includes(
                                      word
                                    )
                                )
                                .map((word) => word[0])
                                .join("")
                                .slice(0, 2)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-stone-900 truncate">
                              {escapeHtml(teacher.name)}
                            </p>
                            <p className="mt-0.5 text-xs text-stone-500 truncate">
                              {escapeHtml(teacher.subject) || "General"}
                            </p>
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
                          <span className="text-stone-500 text-xs">Username</span>
                          <span
                            data-testid={`teacher-username-${teacher.id}`}
                            className="text-xs font-mono font-semibold text-[#0F4D25] truncate max-w-[200px]"
                          >
                            {escapeHtml(teacher.username || (teacher.email ? teacher.email.split("@")[0] : "—"))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-500 text-xs">Email</span>
                          <span className="text-xs font-mono truncate max-w-[200px]">
                            {escapeHtml(teacher.email || "Not provided")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-500 text-xs">Phone</span>
                          <span className="text-xs font-mono tabular-nums">
                            {escapeHtml(teacher.phone || "Not provided")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-500 text-xs">Assigned Classes</span>
                          <span
                            className="truncate ml-2 text-xs font-semibold text-stone-900"
                            data-testid={`teacher-classes-${teacher.id}`}
                          >
                            {escapeHtml(displayClasses.join(", ") || "Unassigned")}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#E7E2D7]">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={statusBadgeStyle(teacher.status)}
                        >
                          {teacher.status === "active"
                            ? "Active"
                            : teacher.status === "on_leave"
                            ? "On leave"
                            : "Inactive"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <AnimatedButton
                            type="button"
                            onClick={() => openEditModal(teacher)}
                            className="rounded-xl bg-[#FAF7F2] border border-[#E7E2D7] px-3 py-2 min-h-[40px] text-xs font-semibold text-stone-800 hover:bg-[#F3EFE6] transition-colors flex items-center gap-1"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </AnimatedButton>
                          <AnimatedButton
                            type="button"
                            onClick={() => {
                              setTeacherToResetPwd(teacher);
                              setResetNewPassword("");
                              setResetConfirmPassword("");
                            }}
                            aria-label={`Reset Password for ${teacher.name}`}
                            className="rounded-xl bg-[#FAF7F2] border border-[#E7E2D7] px-3 py-2 min-h-[40px] text-xs font-semibold text-stone-800 hover:bg-[#F3EFE6] transition-colors flex items-center gap-1"
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Reset Pwd
                          </AnimatedButton>
                          {teacher.status === "active" ? (
                            <AnimatedButton
                              type="button"
                              onClick={() => handleDeactivate(teacher)}
                              aria-label={`Deactivate ${teacher.name}`}
                              className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 min-h-[40px] text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Deactivate
                            </AnimatedButton>
                          ) : (
                            <AnimatedButton
                              type="button"
                              onClick={() => handleReactivate(teacher)}
                              aria-label={`Reactivate ${teacher.name}`}
                              className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 min-h-[40px] text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                            >
                              <UserCheck className="h-3.5 w-3.5" /> Enable
                            </AnimatedButton>
                          )}
                          <MoreActionsMenu
                            items={[
                              {
                                label: "Edit Profile & Access",
                                icon: Edit,
                                onClick: () => openEditModal(teacher),
                              },
                              {
                                label: "Reset Password",
                                icon: KeyRound,
                                onClick: () => {
                                  setTeacherToResetPwd(teacher);
                                  setResetNewPassword("");
                                  setResetConfirmPassword("");
                                },
                              },
                              teacher.status === "active"
                                ? {
                                    label: "Deactivate Teacher",
                                    icon: Trash2,
                                    destructive: true,
                                    onClick: () => handleDeactivate(teacher),
                                  }
                                : {
                                    label: "Enable / Reactivate Teacher",
                                    icon: UserCheck,
                                    onClick: () => handleReactivate(teacher),
                                  },
                            ]}
                            align="end"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* TAB 2: ROLES & PERMISSIONS MATRIX EDITOR */
          <div className="bg-white rounded-2xl border border-[#E7E2D7] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E7E2D7] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Role × Capability Default Permissions Matrix
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Changes persist to <code className="font-mono">public.role_permissions</code> and are enforced server-side on the very next request without redeploy.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E7E2D7] text-stone-700 font-bold">
                    <th className="p-3 min-w-[240px] border-r border-[#E7E2D7]">
                      Capability / Permission Key
                    </th>
                    {ALL_STAFF_ROLES.map((role) => (
                      <th
                        key={role}
                        className="p-2.5 text-center min-w-[115px] border-r border-[#E7E2D7]"
                      >
                        <div className="font-bold text-stone-900">{role}</div>
                        {role !== "Administrator" ? (
                          <button
                            type="button"
                            disabled={savingRoleKey === role}
                            onClick={() => handleSaveRolePermissions(role)}
                            data-testid={`save-role-perms-${role}`}
                            className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-[#0F4D25] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#0A381B] disabled:opacity-50"
                          >
                            {savingRoleKey === role ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span>Save</span>
                          </button>
                        ) : (
                          <span className="mt-1.5 inline-block text-[10px] text-emerald-800 font-semibold">
                            Locked (Full)
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D7]">
                  {PERMISSION_KEYS.map((permKey) => {
                    const meta = PERMISSION_METADATA[permKey];
                    return (
                      <tr key={permKey} className="hover:bg-[#FAF7F2]/60">
                        <td className="p-3 border-r border-[#E7E2D7]">
                          <div className="font-semibold text-stone-900">{meta.label}</div>
                          <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                            {permKey} · {meta.category}
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">{meta.enforcedAt}</div>
                        </td>
                        {ALL_STAFF_ROLES.map((role) => {
                          const checked =
                            role === "Administrator" ||
                            (rolePermissions[role] || []).includes(permKey);
                          return (
                            <td
                              key={`${role}-${permKey}`}
                              className="p-2.5 text-center border-r border-[#E7E2D7]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={role === "Administrator"}
                                onChange={() => handleToggleRolePermission(role, permKey)}
                                aria-label={`${role} - ${meta.label}`}
                                data-testid={`perm-toggle-${role}-${permKey}`}
                                className="w-4 h-4 rounded border-stone-300 text-[#0F4D25] focus:ring-[#0F4D25] disabled:opacity-60 cursor-pointer"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Teacher Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-[#E7E2D7] shadow-xl max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between border-b border-[#E7E2D7] p-6 shrink-0">
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  {selectedTeacher ? "Edit teacher details & access" : "Add a new staff account"}
                </p>
                <h2 className="mt-1 text-xl font-bold text-stone-900">
                  {selectedTeacher ? escapeHtml(selectedTeacher.name) : "Teacher Account Details"}
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
                {!selectedTeacher && (
                  <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E7E2D7] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Account Provisioning Method
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Direct creation sets an initial password immediately (works with public sign-ups OFF).
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setValue("creation_mode", "direct")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          watchedCreationMode === "direct"
                            ? "bg-[#0F4D25] text-white"
                            : "bg-white border border-[#E7E2D7] text-stone-700"
                        }`}
                      >
                        Direct Account + Password
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue("creation_mode", "invite")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          watchedCreationMode === "invite"
                            ? "bg-[#0F4D25] text-white"
                            : "bg-white border border-[#E7E2D7] text-stone-700"
                        }`}
                      >
                        Registration Invite
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      {...register("full_name")}
                      className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#0F4D25]"
                    />
                    {errors.full_name && (
                      <p className="mt-1.5 text-xs text-rose-600">{errors.full_name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Account Role
                    </label>
                    <div className="relative">
                      <select
                        {...register("role", {
                          onChange: (e) => {
                            const nextRole = e.target.value;
                            if (
                              nextRole === "Administrator" ||
                              nextRole === "Principal" ||
                              nextRole === "Head Teacher" ||
                              nextRole === "Deputy Head Teacher"
                            ) {
                              setValue("subject_specialization", "Both");
                              setValue("classes_assigned", []);
                            } else if (nextRole === "DOS Secular") {
                              setValue("subject_specialization", "Secular");
                              setValue("classes_assigned", []);
                            } else if (nextRole === "DOS Theology") {
                              setValue("subject_specialization", "Theology");
                              setValue("classes_assigned", []);
                            } else if (nextRole === "Theology Instructor") {
                              setValue("subject_specialization", "Theology");
                            }
                          },
                        })}
                        data-testid="teacher-role-select"
                        className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 pr-10 text-sm text-stone-900 outline-none appearance-none focus:border-[#0F4D25]"
                      >
                        {ALL_STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                        <option value="Subject Teacher">Subject Teacher</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    </div>
                    {errors.role && (
                      <p className="mt-1.5 text-xs text-rose-600">{errors.role.message}</p>
                    )}
                  </div>
                </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Sign-In Username (no @)
                    </label>
                    <input
                      type="text"
                      data-testid="teacher-username-input"
                      placeholder="Auto-seeded from email prefix if left blank"
                      {...register("username")}
                      className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 text-sm font-mono text-stone-900 outline-none focus:border-[#0F4D25]"
                    />
                    {errors.username && (
                      <p className="mt-1.5 text-xs text-rose-600">{errors.username.message}</p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Email
                    </label>
                    <input
                      type="email"
                      {...register("email")}
                      className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#0F4D25]"
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Phone
                    </label>
                    <input
                      type="text"
                      {...register("phone")}
                      className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#0F4D25]"
                    />
                    {errors.phone && (
                      <p className="mt-1.5 text-xs text-rose-600">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {!selectedTeacher && watchedCreationMode === "direct" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Initial Password (Min. 8 characters)
                    </label>
                    <input
                      type="password"
                      {...register("initial_password")}
                      placeholder="Set initial sign-in password (min 8 chars)"
                      className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#0F4D25]"
                    />
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Scope (Department / Track)
                    </label>
                    <div className="relative">
                      <select
                        {...register("subject_specialization")}
                        data-testid="teacher-department-select"
                        disabled={isSchoolWideRole || isDepartmentWideDOSRole}
                        className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 pr-10 text-sm text-stone-900 outline-none appearance-none focus:border-[#0F4D25] disabled:bg-[#FAF7F2] disabled:text-stone-600"
                      >
                        <option value="Secular">Secular</option>
                        <option value="Theology">Theology</option>
                        <option value="Both">Both (Secular &amp; Theology)</option>
                        <option value="Administration">Administration</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    </div>
                  </div>

                  {selectedTeacher && (
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                        Account Status
                      </label>
                      <div className="relative">
                        <select
                          {...register("status")}
                          className="w-full min-h-[44px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2.5 pr-10 text-sm text-stone-900 outline-none appearance-none focus:border-[#0F4D25]"
                        >
                          <option value="active">Active (Login Enabled)</option>
                          <option value="inactive">Inactive (Suspended / Banned)</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                      </div>
                    </div>
                  )}

                  {/* Dynamic Class Assignment Section (Filtered by Role & Department) */}
                  <div className="col-span-full" data-testid="dynamic-class-assignment-section">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                        Class Assignment &amp; Academic Scope
                      </label>
                      {!isSchoolWideRole && !isDepartmentWideDOSRole && (
                        <span className="text-[11px] font-semibold text-[#0F4D25]">
                          {watchedClassesAssigned.length} class{watchedClassesAssigned.length === 1 ? "" : "es"} selected
                        </span>
                      )}
                    </div>

                    {isSchoolWideRole ? (
                      <div
                        data-testid="banner-school-wide-access"
                        className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#0F4D25] text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#0F4D25]">
                            Automatic School-Wide Access across all Secular &amp; Theology classes.
                          </div>
                          <p className="text-xs text-stone-600 mt-0.5">
                            As <strong>{watchedRole}</strong>, this account automatically supervises 100% of Secular and Theology classes across Nursery, Lower Primary, and Upper Primary. No individual class checkboxes need to be ticked.
                          </p>
                        </div>
                      </div>
                    ) : isDepartmentWideDOSRole ? (
                      <div
                        data-testid="banner-department-wide-access"
                        className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-amber-900">
                            Automatic Department-Wide Access across all{" "}
                            {watchedRole === "DOS Theology" ? "Theology" : "Secular"} classes.
                          </div>
                          <p className="text-xs text-stone-600 mt-0.5">
                            As <strong>{watchedRole}</strong>, this account automatically covers 100% of{" "}
                            {watchedRole === "DOS Theology" ? "Theology" : "Secular"} classes from Baby Class through Primary without manual class checkboxes.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 p-4 border border-[#E7E2D7] rounded-xl bg-[#FAF7F2] max-h-64 overflow-y-auto">
                        {(effectiveModalDepartment === "Secular" ||
                          effectiveModalDepartment === "Both" ||
                          effectiveModalDepartment === "Administration") && (
                          <div data-testid="secular-class-groups" className="space-y-3">
                            {effectiveModalDepartment === "Both" && (
                              <h4 className="text-xs font-extrabold text-[#0F4D25] uppercase tracking-wider border-b border-[#E7E2D7] pb-1">
                                Secular Classes
                              </h4>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {[
                                {
                                  key: "nursery",
                                  title: "Nursery (Baby–Top)",
                                  items: groupedCircularClasses.nursery,
                                },
                                {
                                  key: "lower_primary",
                                  title: "Lower Primary (P.1–P.3)",
                                  items: groupedCircularClasses.lower_primary,
                                },
                                {
                                  key: "upper_primary",
                                  title: "Upper Primary (P.4–P.7)",
                                  items: [
                                    ...groupedCircularClasses.upper_primary,
                                    ...groupedCircularClasses.other,
                                  ],
                                },
                              ].map((group) => (
                                <div
                                  key={group.key}
                                  data-testid={`secular-group-${group.key}`}
                                  className="rounded-xl bg-white border border-[#E7E2D7] p-3 space-y-1.5"
                                >
                                  <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider pb-1 border-b border-stone-100">
                                    {group.title}
                                  </div>
                                  {group.items.length === 0 ? (
                                    <p className="text-[11px] text-stone-400 italic py-1">
                                      No classes in this section
                                    </p>
                                  ) : (
                                    group.items.map((c: any) => {
                                      const checked = watchedClassesAssigned.includes(c.id);
                                      return (
                                        <label
                                          key={c.id}
                                          className="flex items-center gap-2 min-h-[28px] cursor-pointer group"
                                        >
                                          <input
                                            type="checkbox"
                                            value={c.id}
                                            checked={checked}
                                            onChange={(e) =>
                                              toggleClassIdSelection(c.id, e.target.checked)
                                            }
                                            className="w-4 h-4 rounded border-stone-300 text-[#0F4D25] focus:ring-[#0F4D25]"
                                          />
                                          <span className="text-xs font-semibold text-stone-800 group-hover:text-[#0F4D25] transition-colors">
                                            {c.class_name}
                                          </span>
                                        </label>
                                      );
                                    })
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(effectiveModalDepartment === "Theology" ||
                          effectiveModalDepartment === "Both") && (
                          <div data-testid="theology-class-groups" className="space-y-3">
                            {effectiveModalDepartment === "Both" && (
                              <h4 className="text-xs font-extrabold text-amber-800 uppercase tracking-wider border-b border-[#E7E2D7] pb-1 pt-2">
                                Theology Classes (الفصول الشرعية)
                              </h4>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {[
                                {
                                  key: "nursery",
                                  title: "Nursery (Baby–Top)",
                                  items: groupedTheologyClasses.nursery,
                                },
                                {
                                  key: "lower_primary",
                                  title: "Lower Primary (P.1–P.3)",
                                  items: groupedTheologyClasses.lower_primary,
                                },
                                {
                                  key: "upper_primary",
                                  title: "Upper Primary (P.4–P.7)",
                                  items: [
                                    ...groupedTheologyClasses.upper_primary,
                                    ...groupedTheologyClasses.other,
                                  ],
                                },
                              ].map((group) => (
                                <div
                                  key={group.key}
                                  data-testid={`theology-group-${group.key}`}
                                  className="rounded-xl bg-white border border-[#E7E2D7] p-3 space-y-1.5"
                                >
                                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider pb-1 border-b border-stone-100">
                                    {group.title}
                                  </div>
                                  {group.items.length === 0 ? (
                                    <p className="text-[11px] text-stone-400 italic py-1">
                                      No classes in this section
                                    </p>
                                  ) : (
                                    group.items.map((t: any) => {
                                      const checked = watchedClassesAssigned.includes(t.id);
                                      return (
                                        <label
                                          key={t.id}
                                          className="flex items-center gap-2 min-h-[28px] cursor-pointer group"
                                        >
                                          <input
                                            type="checkbox"
                                            value={t.id}
                                            checked={checked}
                                            onChange={(e) =>
                                              toggleClassIdSelection(t.id, e.target.checked)
                                            }
                                            className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                                          />
                                          <span className="text-xs font-semibold text-stone-800 group-hover:text-amber-800 transition-colors">
                                            {t.class_name_english || t.class_name_arabic}
                                            {t.class_name_english && t.class_name_arabic
                                              ? ` (${t.class_name_arabic})`
                                              : ""}
                                          </span>
                                        </label>
                                      );
                                    })
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Two-Part Permissions Section: 1) Included by Role Default + 2) Extra Per-User Overrides */}
                  <div className="col-span-full space-y-3">
                    <div
                      data-testid="role-default-permissions-section"
                      className="rounded-xl border border-[#E7E2D7] bg-[#FAF7F2] p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                          Included by Role Default ({resolvedModalRoleKey})
                        </span>
                        <span className="text-[11px] font-semibold text-[#0F4D25]">
                          {roleDefaultPermissionKeys.length} built-in capabilities (Zero overrides needed)
                        </span>
                      </div>
                      {roleDefaultPermissionKeys.length === 0 ? (
                        <p className="text-xs text-stone-500 italic">
                          No academic permissions included by default for {resolvedModalRoleKey}.
                        </p>
                      ) : (
                        <div
                          data-testid="role-default-permissions-chips"
                          className="flex flex-wrap gap-1.5"
                        >
                          {roleDefaultPermissionKeys.map((permKey) => (
                            <span
                              key={permKey}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 border border-emerald-300/80 px-2.5 py-1 text-[11px] font-semibold text-[#0F4D25]"
                            >
                              <Check className="w-3 h-3 shrink-0" />
                              <span>{PERMISSION_METADATA[permKey]?.label || permKey}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {resolvedModalRoleKey !== "Administrator" && (
                      <details
                        data-testid="per-user-overrides-collapsible"
                        className="group rounded-xl border border-[#E7E2D7] bg-white overflow-hidden"
                      >
                        <summary className="list-none cursor-pointer px-4 py-2.5 flex items-center justify-between gap-2 bg-white hover:bg-[#FAF7F2] transition-colors select-none">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                              Extra Per-User Overrides (Optional)
                            </span>
                            {watchedPermissions.length > 0 && (
                              <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                                {watchedPermissions.length} custom override{watchedPermissions.length === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                          <ChevronDown className="w-4 h-4 text-stone-400 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="p-3.5 border-t border-[#E7E2D7] bg-[#FAF7F2] space-y-2">
                          <p className="text-[11px] text-stone-500">
                            Only tick boxes below if this specific individual needs an exception beyond the standard{" "}
                            <strong>{resolvedModalRoleKey}</strong> role defaults.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pt-1">
                            {PERMISSION_KEYS.map((permKey) => {
                              const isDefault = roleDefaultPermissionKeys.includes(permKey);
                              return (
                                <label
                                  key={permKey}
                                  className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    value={permKey}
                                    checked={isDefault || watchedPermissions.includes(permKey)}
                                    disabled={isDefault}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...watchedPermissions, permKey]
                                        : watchedPermissions.filter((p) => p !== permKey);
                                      setValue("permissions", next);
                                    }}
                                    className="w-3.5 h-3.5 rounded border-stone-300 text-[#0F4D25] focus:ring-[#0F4D25] disabled:opacity-60"
                                  />
                                  <span className={isDefault ? "text-stone-400" : "font-medium text-stone-800"}>
                                    {PERMISSION_METADATA[permKey].label}
                                    {isDefault ? " (Role Default)" : ""}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 sm:flex-row border-t border-[#E7E2D7] mt-4">
                  <AnimatedButton
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 min-h-[44px] rounded-xl bg-[#0F4D25] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : selectedTeacher
                      ? "Update Teacher"
                      : watchedCreationMode === "direct"
                      ? "Create Staff Account"
                      : "Send Invite"}
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

      {/* Admin Reset Password Modal */}
      {teacherToResetPwd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E7E2D7] shadow-xl p-6">
            <h3 className="text-lg font-bold text-stone-900">
              Reset Password for {escapeHtml(teacherToResetPwd.name)}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Account: <span className="font-mono">{escapeHtml(teacherToResetPwd.email)}</span>
            </p>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 mt-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-700">
                  New Password (Min. 8 characters)
                </label>
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full min-h-[42px] rounded-xl border border-[#E7E2D7] bg-white px-3.5 py-2 text-sm text-stone-900 outline-none focus:border-[#0F4D25]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full min-h-[42px] rounded-xl border border-[#E7E2D7] bg-white px-3.5 py-2 text-sm text-stone-900 outline-none focus:border-[#0F4D25]"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="flex-1 min-h-[42px] rounded-xl bg-[#0F4D25] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A381B] disabled:opacity-50"
                >
                  {resettingPassword ? "Updating..." : "Update Password"}
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherToResetPwd(null)}
                  className="flex-1 min-h-[42px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDestructiveDialog
        open={Boolean(teacherToDeactivate)}
        title={`Deactivate ${teacherToDeactivate?.name || "Teacher"}?`}
        description={`Are you sure you want to deactivate ${
          teacherToDeactivate?.name || "this teacher"
        }? Their login access will be suspended while preserving all historical marks and remarks.`}
        confirmLabel="Deactivate Teacher"
        loading={deactivating}
        onConfirm={confirmDeactivate}
        onCancel={() => setTeacherToDeactivate(null)}
      />
    </div>
  );
}
