'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search,
  LayoutDashboard,
  Users,
  ClipboardEdit,
  FileText,
  ScrollText,
  BookOpen,
  UserCheck,
  Settings,
  Shield,
  Upload,
  Calendar,
  X,
  ArrowRight,
} from 'lucide-react'

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ElementType
  href: string
  category: 'Pages' | 'Actions' | 'Tools'
}

const COMMAND_ITEMS: CommandItem[] = [
  { id: 'dash', title: 'Dashboard', subtitle: 'Reporting control room', icon: LayoutDashboard, href: '/admin', category: 'Pages' },
  { id: 'students', title: 'Students Directory', subtitle: 'Learner cohorts & admissions', icon: Users, href: '/admin/students', category: 'Pages' },
  { id: 'marks', title: 'Marks Entry', subtitle: 'Record BOT, MOT, EOT scores', icon: ClipboardEdit, href: '/admin/marks', category: 'Pages' },
  { id: 'reports', title: 'Report Center', subtitle: 'Generate, preview & print reports', icon: FileText, href: '/admin/reports', category: 'Pages' },
  { id: 'studio', title: 'Report Studio 2.0', subtitle: 'Document IDE, stamps & watermarks', icon: FileText, href: '/admin/reports/studio', category: 'Tools' },
  { id: 'secular', title: 'Secular Hub', subtitle: 'Circular assessment broadsheets', icon: ScrollText, href: '/admin/secular-hub', category: 'Pages' },
  { id: 'theology', title: 'Theology Hub', subtitle: 'Islamic curriculum evaluation', icon: BookOpen, href: '/admin/theology-hub', category: 'Pages' },
  { id: 'rollcall', title: 'Daily Roll Call', subtitle: 'Attendance records', icon: Calendar, href: '/teacher/roll-call', category: 'Pages' },
  { id: 'teachers', title: 'Teachers & Staff', subtitle: 'Staff directory & classes', icon: UserCheck, href: '/admin/teachers', category: 'Pages' },
  { id: 'uploads', title: 'Upload Center', subtitle: 'Bulk data & marks imports', icon: Upload, href: '/admin/uploads', category: 'Tools' },
  { id: 'settings', title: 'Settings', subtitle: 'Branding, grading scales & preferences', icon: Settings, href: '/admin/settings', category: 'Pages' },
  { id: 'audit', title: 'Audit Trail', subtitle: 'System activities & logs', icon: Shield, href: '/admin/activity', category: 'Tools' },
]

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = COMMAND_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase())) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      } else if (e.key === 'Escape' && open) {
        e.preventDefault()
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false)
      setQuery('')
      router.push(href)
    },
    [onOpenChange, router]
  )

  const handleNavigateKeys = (e: React.KeyboardEvent) => {
    if (filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[selectedIndex]
      if (item) handleSelect(item.href)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          onClick={() => onOpenChange(false)}
        />

        {/* Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl overflow-hidden z-10"
          onKeyDown={handleNavigateKeys}
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
            <Search size={18} className="text-[var(--text-secondary)] shrink-0" strokeWidth={1.75} />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find pages, tools, reports... (Type or navigate)"
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-md"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded border border-[var(--border)]">
                ESC
              </kbd>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto p-2" style={{ scrollbarWidth: 'thin' }}>
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                No matching results found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((item, idx) => {
                  const Icon = item.icon
                  const isSelected = idx === selectedIndex
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[var(--accent-primary)] text-white'
                              : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <Icon size={16} strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs truncate font-semibold">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-[11px] text-[var(--text-secondary)] truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] font-mono">
                          {item.category}
                        </span>
                        {isSelected && <ArrowRight size={14} className="text-[var(--accent-primary)]" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer Guide */}
          <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-hover)]/40 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
            </div>
            <span>Jiddah Smart Engine</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
