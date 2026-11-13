"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardEdit,
  FileText,
  ScrollText,
  BookOpen,
  UserCheck,
  UploadCloud,
  CalendarCheck,
  Settings,
  Bell,
  User,
  Search,
  Layers,
  GraduationCap,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { resolveUserScope } from "@/lib/access-scope";

interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
  section: "Pages" | "Students" | "Classes" | "Staff" | "Actions";
  href: string;
  icon: React.ElementType;
  keywords?: string;
  adminOnly?: boolean;
  department?: "secular" | "theology";
  requiresClassTeacher?: boolean;
}

const STATIC_COMMAND_ITEMS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", section: "Pages", href: "/admin", icon: LayoutDashboard, keywords: "home overview metrics" },
  { id: "marks", label: "Marks Entry", section: "Pages", href: "/admin/marks", icon: ClipboardEdit, keywords: "scores grades assessment bot mot eot" },
  { id: "students", label: "Students Directory", section: "Pages", href: "/admin/students", icon: Users, keywords: "pupils learners roster", requiresClassTeacher: true },
  { id: "classes", label: "Classes & Streams", section: "Pages", href: "/admin/classes", icon: Layers, keywords: "cohorts streams homeroom", requiresClassTeacher: true },
  { id: "subjects", label: "Subjects Curriculum", section: "Pages", href: "/admin/subjects", icon: GraduationCap, keywords: "courses papers curriculum" },
  { id: "reports", label: "Report Center", section: "Pages", href: "/admin/reports", icon: FileText, keywords: "report cards pdf print", requiresClassTeacher: true },
  { id: "studio", label: "Report Studio 2.0", section: "Pages", href: "/admin/reports/studio", icon: FileText, keywords: "customize template layout stamp", requiresClassTeacher: true },
  { id: "secular-hub", label: "Secular Hub", section: "Pages", href: "/admin/secular-hub", icon: ScrollText, keywords: "broadsheet secular primary nursery", department: "secular" },
  { id: "theology-hub", label: "Theology Hub", section: "Pages", href: "/admin/theology-hub", icon: BookOpen, keywords: "arabic islamic theology broadsheet", department: "theology" },
  { id: "roll-call", label: "Daily Roll Call", section: "Pages", href: "/teacher/roll-call", icon: CalendarCheck, keywords: "attendance register", requiresClassTeacher: true },
  { id: "teachers", label: "Teachers & Staff", section: "Pages", href: "/admin/teachers", icon: UserCheck, keywords: "faculty staff invites", adminOnly: true },
  { id: "uploads", label: "Upload Center", section: "Pages", href: "/admin/upload", icon: UploadCloud, keywords: "import csv excel bulk", adminOnly: true },
  { id: "notifications", label: "Notifications", section: "Actions", href: "/admin/notifications", icon: Bell, keywords: "alerts inbox" },
  { id: "account", label: "My Account", section: "Actions", href: "/admin/account", icon: User, keywords: "profile password avatar" },
  { id: "settings", label: "School Settings", section: "Actions", href: "/admin/settings", icon: Settings, keywords: "branding terms grading signatures", adminOnly: true },
];

let cachedDynamicItems: CommandItem[] | null = null;
let cachedAt = 0;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [dynamicItems, setDynamicItems] = React.useState<CommandItem[]>(cachedDynamicItems || []);
  const [loadingDynamic, setLoadingDynamic] = React.useState(false);
  const [userRole, setUserRole] = React.useState("Administrator");
  const [userSubject, setUserSubject] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    const onCustomOpen = () => onOpenChange(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("jiddah:open-command-palette", onCustomOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("jiddah:open-command-palette", onCustomOpen);
    };
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 20);

    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: any) => {
      const user = data?.session?.user;
      if (user) {
        setUserRole(user.app_metadata?.role || user.user_metadata?.role || "Class Teacher");
        setUserSubject(user.user_metadata?.subject || "");
      }
    });

    if (cachedDynamicItems && Date.now() - cachedAt < 60_000) {
      setDynamicItems(cachedDynamicItems);
      return;
    }

    let cancelled = false;
    setLoadingDynamic(true);

    Promise.allSettled([
      fetch("/api/students").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/classes").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/theology-classes").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/teachers").then((r) => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([studentsRes, classesRes, theoClassesRes, teachersRes]) => {
        if (cancelled) return;
        const nextItems: CommandItem[] = [];

        if (studentsRes.status === "fulfilled") {
          const rawStudents = Array.isArray(studentsRes.value)
            ? studentsRes.value
            : Array.isArray(studentsRes.value?.data)
              ? studentsRes.value.data
              : [];
          for (const s of rawStudents.slice(0, 150)) {
            if (!s?.id || !s?.name) continue;
            const adm = s.admission_number || "";
            const cls = s.circular_class || s.theology_class_english || "";
            nextItems.push({
              id: `student-${s.id}`,
              label: s.name,
              subtitle: [adm, cls].filter(Boolean).join(" • ") || "Student",
              section: "Students",
              href: `/admin/students?search=${encodeURIComponent(s.name)}`,
              icon: Users,
              keywords: `${s.name} ${adm} ${cls} ${s.arabic_name || ""}`,
              requiresClassTeacher: true,
            });
          }
        }

        if (classesRes.status === "fulfilled") {
          const rawClasses = Array.isArray(classesRes.value?.data)
            ? classesRes.value.data
            : Array.isArray(classesRes.value)
              ? classesRes.value
              : [];
          for (const c of rawClasses) {
            if (!c?.id || !c?.class_name) continue;
            nextItems.push({
              id: `class-${c.id}`,
              label: c.class_name,
              subtitle: c.section ? `Secular • ${c.section}` : "Secular Class",
              section: "Classes",
              href: `/admin/classes/${c.id}`,
              icon: Layers,
              keywords: `${c.class_name} ${c.section || ""} secular class`,
              department: "secular",
              requiresClassTeacher: true,
            });
          }
        }

        if (theoClassesRes.status === "fulfilled") {
          const rawTheo = Array.isArray(theoClassesRes.value?.data)
            ? theoClassesRes.value.data
            : Array.isArray(theoClassesRes.value)
              ? theoClassesRes.value
              : [];
          for (const t of rawTheo) {
            const name = t?.class_name_english || t?.class_name_arabic;
            if (!t?.id || !name) continue;
            nextItems.push({
              id: `theo-class-${t.id}`,
              label: name,
              subtitle: t.class_name_arabic && t.class_name_english ? `Theology • ${t.class_name_arabic}` : "Theology Class",
              section: "Classes",
              href: `/admin/classes`,
              icon: BookOpen,
              keywords: `${t.class_name_english || ""} ${t.class_name_arabic || ""} theology class`,
              department: "theology",
              requiresClassTeacher: true,
            });
          }
        }

        if (teachersRes.status === "fulfilled") {
          const rawTeachers = Array.isArray(teachersRes.value?.data)
            ? teachersRes.value.data
            : Array.isArray(teachersRes.value)
              ? teachersRes.value
              : [];
          for (const t of rawTeachers.slice(0, 80)) {
            if (!t?.id || !t?.name) continue;
            nextItems.push({
              id: `staff-${t.id}`,
              label: t.name,
              subtitle: [t.role, t.subject].filter(Boolean).join(" • "),
              section: "Staff",
              href: `/admin/teachers`,
              icon: UserCheck,
              keywords: `${t.name} ${t.role || ""} ${t.subject || ""} ${t.email || ""}`,
              adminOnly: true,
            });
          }
        }

        cachedDynamicItems = nextItems;
        cachedAt = Date.now();
        setDynamicItems(nextItems);
      })
      .finally(() => {
        if (!cancelled) setLoadingDynamic(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const scope = React.useMemo(
    () => resolveUserScope({ role: userRole, subject: userSubject, status: "active" }),
    [userRole, userSubject]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    const canSeeItem = (item: CommandItem) => {
      if (item.adminOnly && !scope.canManageTeachers && !scope.canManageSettings) return false;
      if (item.department === "secular" && !scope.canAccessSecular) return false;
      if (item.department === "theology" && !scope.canAccessTheology) return false;
      if (item.requiresClassTeacher && scope.isTeacher && !scope.isClassTeacher) return false;
      return true;
    };

    const allowedStatic = STATIC_COMMAND_ITEMS.filter(canSeeItem);
    const allowedDynamic = dynamicItems.filter(canSeeItem);

    if (!q) {
      return [...allowedStatic, ...allowedDynamic.slice(0, 6)];
    }

    const matches = (item: CommandItem) =>
      item.label.toLowerCase().includes(q) ||
      (item.subtitle || "").toLowerCase().includes(q) ||
      (item.keywords || "").toLowerCase().includes(q);

    return [...allowedStatic.filter(matches), ...allowedDynamic.filter(matches).slice(0, 15)];
  }, [query, dynamicItems, scope]);

  const handleSelect = (item: CommandItem) => {
    onOpenChange(false);
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16 sm:pt-20 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <Search className="size-4 text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search pages, students, classes, or staff..."
            aria-label="Search pages, students, classes, or staff"
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          {loadingDynamic && (
            <span className="text-[11px] text-[var(--text-muted)] shrink-0">Indexing…</span>
          )}
          <kbd className="rounded border border-[var(--border)] bg-[var(--bg-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No matching pages, students, classes, or staff found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="size-4 shrink-0 text-[var(--text-muted)]" />
                    <div className="min-w-0">
                      <span className="block truncate">{item.label}</span>
                      {item.subtitle && (
                        <span className="block truncate text-[11px] font-normal text-[var(--text-muted)]">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {item.section}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
