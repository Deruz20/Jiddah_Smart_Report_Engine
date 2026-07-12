"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Bell,
  ChevronRight,
  ChevronDown,
  Home,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  Clock,
  GraduationCap,
  ClipboardEdit,
  FileText,
  Users,
} from "lucide-react";
import { useSidebar } from "../figma-ui/ui/sidebar";
import { cn } from "../figma-ui/ui/utils";

/* ─── Breadcrumbs (desktop only) ─────────────────────────────────────────── */

function Breadcrumbs({ crumbs }: { crumbs: string[] }) {
  return (
    <nav className="hidden md:flex items-center gap-1">
      <Home className="size-3.5 text-slate-400" strokeWidth={1.8} />
      {crumbs.map((crumb, i) => (
        <React.Fragment key={crumb}>
          <ChevronRight className="size-3 text-slate-300/40" strokeWidth={2} />
          <span
            className={cn(
              "transition-colors duration-150",
              i === crumbs.length - 1
                ? "text-slate-800 font-medium"
                : "text-slate-400 hover:text-slate-600 cursor-pointer",
            )}
            style={{ fontSize: "0.8rem" }}
          >
            {crumb}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}

/* ─── Desktop Search ──────────────────────────────────────────────────────── */

function DesktopSearch() {
  const [focused, setFocused] = React.useState(false);
  const [query, setQuery] = React.useState("");

  return (
    <motion.div
      animate={{ width: focused ? "22rem" : "16rem" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "relative hidden md:flex items-center gap-2 h-9 px-3 rounded-xl transition-all duration-200 border",
        focused
          ? "bg-white border-slate-200 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
          : "bg-slate-100/80 border-slate-200/50 hover:bg-slate-100 hover:border-slate-200",
      )}
    >
      <Search
        className={cn("size-3.5 shrink-0 transition-colors duration-200", focused ? "text-emerald-500" : "text-slate-400")}
        strokeWidth={2}
      />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search students, classes..."
        className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 min-w-0"
        style={{ fontSize: "0.8rem" }}
      />
      <AnimatePresence>
        {!focused && (
          <motion.kbd
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-slate-400 bg-slate-200/70 border border-slate-200"
            style={{ fontSize: "0.65rem" }}
          >
            ⌘K
          </motion.kbd>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Mobile Full-Screen Search Overlay ──────────────────────────────────── */

const recentSearches = ["Grade 7A — Fatimah", "Term 1 Mathematics", "Ahmed Al-Rashid"];
const quickActions = [
  { label: "Add Marks", icon: ClipboardEdit, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)" },
  { label: "New Report", icon: FileText, color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.15)" },
  { label: "Students", icon: Users, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)" },
];

function MobileSearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 md:hidden"
            style={{ background: "rgba(15,23,42,0.25)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 left-0 right-0 z-50 md:hidden rounded-b-3xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.99)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
            }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 pt-14 pb-3">
              <div
                className="flex-1 flex items-center gap-3 h-12 px-4 rounded-2xl"
                style={{ background: "rgba(0,0,0,0.05)", border: "1.5px solid rgba(16,185,129,0.3)" }}
              >
                <Search className="size-4 text-emerald-400 shrink-0" strokeWidth={2} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search students, classes, reports..."
                  className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                  style={{ fontSize: "0.9rem" }}
                />
                {query && (
                  <button onClick={() => setQuery("")} className="shrink-0 text-slate-400">
                    <X className="size-4" strokeWidth={2} />
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 text-emerald-500 font-semibold py-2"
                style={{ fontSize: "0.88rem" }}
              >
                Cancel
              </button>
            </div>

            {/* Content below search */}
            {!query ? (
              <div className="px-4 pb-6">
                <p className="text-slate-400 uppercase tracking-widest mb-2.5" style={{ fontSize: "0.64rem", fontWeight: 600 }}>
                  Recent Searches
                </p>
                <div className="flex flex-col">
                  {recentSearches.map((s) => (
                    <button key={s} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0 active:bg-slate-50 rounded-xl px-1">
                      <div className="flex items-center justify-center size-8 rounded-xl shrink-0" style={{ background: "rgba(0,0,0,0.04)" }}>
                        <Clock className="size-3.5 text-slate-400" strokeWidth={2} />
                      </div>
                      <span className="text-slate-700 flex-1 text-left" style={{ fontSize: "0.88rem" }}>{s}</span>
                      <ChevronRight className="size-3.5 text-slate-300" strokeWidth={2.5} />
                    </button>
                  ))}
                </div>

                <p className="text-slate-400 uppercase tracking-widest mb-3 mt-5" style={{ fontSize: "0.64rem", fontWeight: 600 }}>
                  Quick Actions
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {quickActions.map(({ label, icon: Icon, color, bg, border }) => (
                    <button
                      key={label}
                      className="flex flex-col items-center gap-2 p-3.5 rounded-2xl active:scale-95 transition-transform duration-100"
                      style={{ background: bg, border: `1px solid ${border}` }}
                    >
                      <Icon className="size-5" style={{ color }} strokeWidth={1.8} />
                      <span style={{ fontSize: "0.72rem", color, fontWeight: 500, lineHeight: 1.2, textAlign: "center" }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 pb-6">
                <p className="text-slate-400 py-6 text-center" style={{ fontSize: "0.85rem" }}>
                  No results for "{query}"
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Term Badge (desktop only) ──────────────────────────────────────────── */

function TermBadge() {
  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.06) 100%)",
        border: "1px solid rgba(16,185,129,0.2)",
      }}
    >
      <div className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-emerald-700 font-medium" style={{ fontSize: "0.75rem" }}>
        Term 1, 2026
      </span>
    </div>
  );
}

/* ─── Notification Bell ───────────────────────────────────────────────────── */

function NotificationBell({ size = "default" }: { size?: "default" | "mobile" }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex items-center justify-center rounded-xl text-slate-500 transition-all duration-200",
          size === "mobile"
            ? "size-11 hover:bg-slate-100 active:bg-slate-100"
            : "size-9 hover:text-slate-700 hover:bg-slate-100",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Bell className={size === "mobile" ? "size-5" : "size-[1.1rem]"} strokeWidth={1.8} />
        <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200/60 overflow-hidden z-50"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-slate-800" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Notifications</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600" style={{ fontSize: "0.7rem", fontWeight: 600 }}>3 new</span>
            </div>
            {[
              { title: "3 reports pending review", time: "5 min ago", dot: "bg-orange-400" },
              { title: "Marks entry deadline: Friday", time: "2 hr ago", dot: "bg-emerald-400" },
              { title: "Grade 8B results uploaded", time: "Yesterday", dot: "bg-emerald-400" },
            ].map((n) => (
              <div key={n.title} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer">
                <div className={`mt-1.5 size-2 rounded-full shrink-0 ${n.dot}`} />
                <div>
                  <p className="text-slate-700" style={{ fontSize: "0.8rem" }}>{n.title}</p>
                  <p className="text-slate-400 mt-0.5" style={{ fontSize: "0.72rem" }}>{n.time}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── User Profile Dropdown ───────────────────────────────────────────────── */

function UserProfileDropdown() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-200",
          open ? "bg-slate-100 shadow-sm" : "hover:bg-slate-100",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div
          className="flex items-center justify-center size-7 rounded-lg text-white font-semibold shrink-0"
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            fontSize: "0.65rem",
            boxShadow: "0 2px 6px rgba(16,185,129,0.3)",
          }}
        >
          AH
        </div>
        <div className="hidden md:block text-left">
          <p className="text-slate-800 font-medium leading-tight" style={{ fontSize: "0.78rem" }}>Admin Hassan</p>
          <p className="text-slate-400 leading-tight" style={{ fontSize: "0.68rem" }}>Head Teacher</p>
        </div>
        <ChevronDown
          className={cn("hidden md:block size-3.5 text-slate-400 transition-transform duration-200", open && "rotate-180")}
          strokeWidth={2.5}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl bg-white border border-slate-200/60 overflow-hidden z-50"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
          >
            <div className="p-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center size-9 rounded-xl text-white font-semibold shrink-0"
                  style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", fontSize: "0.8rem", boxShadow: "0 2px 8px rgba(16,185,129,0.3)" }}
                >AH</div>
                <div>
                  <p className="text-slate-800 font-semibold" style={{ fontSize: "0.82rem" }}>Admin Hassan</p>
                  <p className="text-slate-400" style={{ fontSize: "0.72rem" }}>admin@jsre.edu.sa</p>
                </div>
              </div>
            </div>
            <div className="p-1.5">
              {[{ icon: User, label: "My Profile" }, { icon: Settings, label: "Settings" }].map(({ icon: Icon, label }) => (
                <button key={label} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-150" style={{ fontSize: "0.8rem" }}>
                  <Icon className="size-3.5 text-slate-400" strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </div>
            <div className="p-1.5 border-t border-slate-100">
              <button className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-all duration-150" style={{ fontSize: "0.8rem" }}>
                <LogOut className="size-3.5" strokeWidth={1.8} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Topbar ─────────────────────────────────────────────────────────── */

interface AppTopbarProps {
  breadcrumbs?: string[];
  currentPage?: string;
}

export function AppTopbar({ breadcrumbs = ["Admin", "Dashboard"], currentPage = "Dashboard" }: AppTopbarProps) {
  const { toggleSidebar } = useSidebar();
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "rgba(0,0,0,0.06)",
        }}
      >
        {/* ── Mobile layout ── */}
        <div className="md:hidden flex items-center h-14 px-2">
          {/* Left: hamburger */}
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center size-11 rounded-xl text-slate-600 active:bg-slate-100 transition-colors"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Menu className="size-5" strokeWidth={1.8} />
          </button>

          {/* Center: brand */}
          <div className="flex-1 flex justify-center items-center gap-2">
            <div
              className="flex items-center justify-center size-7 rounded-lg shrink-0"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", boxShadow: "0 2px 8px rgba(249,115,22,0.35)" }}
            >
              <GraduationCap className="size-3.5 text-white" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-900" style={{ fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.1 }}>
                Jiddah Smart
              </span>
              <span className="text-slate-400" style={{ fontSize: "0.62rem", lineHeight: 1.1 }}>
                {currentPage}
              </span>
            </div>
          </div>

          {/* Right: search + bell */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center size-11 rounded-xl text-slate-500 active:bg-slate-100 transition-colors"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <Search className="size-5" strokeWidth={1.8} />
            </button>
            <NotificationBell size="mobile" />
          </div>
        </div>

        {/* ── Desktop layout ── */}
        <div className="hidden md:flex items-center gap-3 h-14 px-4">
          <div className="flex items-center gap-3">
            <Breadcrumbs crumbs={breadcrumbs} />
          </div>
          <div className="flex-1 flex justify-center">
            <DesktopSearch />
          </div>
          <div className="flex items-center gap-2">
            <TermBadge />
            <NotificationBell />
            <div className="w-px h-5 bg-slate-200 mx-0.5" />
            <UserProfileDropdown />
          </div>
        </div>
      </header>

      <MobileSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
