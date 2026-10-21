'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/figma-ui/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'
import DashboardContent, { DashboardData } from '@/components/layout/dashboard-content'
import NotificationsClient from '@/components/layout/notifications-client'
import SettingsClient from '@/components/SettingsClient'
import { AdminMarksEntryClient } from '@/components/AdminMarksEntryClient'
import { ReportGeneratorClient } from '@/components/ReportGeneratorClient'
import { DirectionAEmeraldMinbar } from '@/components/dashboard/DirectionAEmeraldMinbar'
import { DirectionBModernNordic } from '@/components/dashboard/DirectionBModernNordic'
import { DirectionCVibrantOasis } from '@/components/dashboard/DirectionCVibrantOasis'
import { TermData } from '@/types/models'

const mockTerms: TermData[] = [
  { id: 'term-1', academic_year: 2026, term_number: 1, label: 'Term 1, 2026', is_current: true },
  { id: 'term-2', academic_year: 2025, term_number: 3, label: 'Term 3, 2025', is_current: false },
]

const mockSettingsTerms = [
  { id: 'term-1', academic_year: 2026, term_number: 1, label: 'Term 1, 2026', is_current: true, start_date: '2026-02-01', end_date: '2026-05-01', next_term_start: '2026-05-25' },
  { id: 'term-2', academic_year: 2025, term_number: 3, label: 'Term 3, 2025', is_current: false, start_date: '2025-09-01', end_date: '2025-12-01', next_term_start: '2026-02-01' },
]

const mockDashboardData: DashboardData = {
  role: 'admin',
  kpis: {
    totalStudents: 450,
    activeTeachers: 28,
    reportsGenerated: 412,
    avgAttendance: 94,
    missingMarks: 0,
    totalAnomalies: 0,
    readyToPrintCount: 0,
  },
  classStatuses: [],
  attendanceTrend: [
    { month: 'Sep', rate: 94 },
    { month: 'Oct', rate: 96 },
    { month: 'Nov', rate: 91 },
    { month: 'Dec', rate: 88 },
    { month: 'Jan', rate: 93 },
    { month: 'Feb', rate: 95 },
    { month: 'Mar', rate: 97 },
    { month: 'Apr', rate: 92 },
  ],
  classPerformance: [
    { class: 'Primary 1', avg: 82 },
    { class: 'Primary 2', avg: 79 },
    { class: 'Primary 3', avg: 85 },
    { class: 'Primary 4', avg: 74 },
    { class: 'Primary 5', avg: 88 },
    { class: 'Primary 6', avg: 81 },
    { class: 'Primary 7', avg: 91 },
  ],
  recentActivity: [
    { id: '1', entity_type: 'report', user_name: 'Admin User', action: 'generate_batch_reports', created_at: new Date().toISOString() },
    { id: '2', entity_type: 'marks', user_name: 'Tr. Sarah', action: 'save_circular_marks', created_at: new Date().toISOString() },
  ],
  notifications: [
    { id: '1', title: 'Staff Assembly', message: 'General academic briefing at 4 PM', time: 'Today', read: false },
    { id: '2', title: 'Marks Submission Deadline', message: 'Term 3 marks closing this Friday', time: 'Yesterday', read: true },
  ],
  themeSettings: {
    schoolName: 'Jiddah Islamic Schools',
    rawThemeColor: '#0F4D25',
    safeThemeColor: '#0F4D25',
    contrastRatio: 9.64,
    wasAdjusted: false,
    currentTerm: 'Term 3',
    currentYear: 2026,
  },
}

const mockNotifications = [
  { id: 1, title: 'End of Term Assessment Ready', message: 'Class marks for P.7 EOT have been saved.', time: new Date().toISOString(), read: false, priority: 'high', type: 'report' },
  { id: 2, title: 'Staff Meeting Notice', message: 'General staff meeting tomorrow at 9 AM in the main hall.', time: new Date().toISOString(), read: true, priority: 'normal', type: 'system' },
]

const mockActivities = [
  { id: '1', user_name: 'Tr. Abdullah', action: 'Entered P.7 Mathematics marks', entity_label: 'Primary 7', entity_type: 'marks', created_at: new Date().toISOString() },
  { id: '2', user_name: 'Headteacher', action: 'Approved Term 1 Report Cards', entity_label: 'All Classes', entity_type: 'report', created_at: new Date().toISOString() },
]

function PreviewShellContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialView = searchParams.get('view') || 'shell'
  const [activeView, setActiveView] = useState<string>(initialView)

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.replace('/login')
    }
  }, [router])

  useEffect(() => {
    const v = searchParams.get('view')
    if (v) setActiveView(v)
  }, [searchParams])

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="h-screen overflow-hidden max-w-full bg-slate-50 dark:bg-[#0f172a] flex flex-col min-w-0 relative">
        <AppTopbar />
        {/* Development View Switcher Toolbar */}
        <div className="w-full max-w-full overflow-x-auto bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 text-xs shrink-0">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] shrink-0">Preview Canvas:</span>
          {[
            { id: 'shell', label: 'Shell Canvas' },
            { id: 'dashboard', label: 'Default Dashboard' },
            { id: 'direction-a', label: 'Direction A: Minbar' },
            { id: 'direction-b', label: 'Direction B: Nordic' },
            { id: 'direction-c', label: 'Direction C: Oasis' },
            { id: 'settings', label: 'Settings' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'marks', label: 'Marks Entry' },
            { id: 'reports', label: 'Reports' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                activeView === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic View Canvas */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeView === 'shell' && (
            <div className="p-6">
              <h1 className="text-xl font-bold text-slate-800">Mobile Navigation & Shell Test Canvas</h1>
              <p className="text-sm text-slate-500 mt-1">
                Automated verification harness for topbar actions, hamburger toggle, and mobile drawer accessibility.
              </p>
            </div>
          )}

          {activeView === 'dashboard' && (
            <div className="w-full h-full">
              <DashboardContent data={mockDashboardData} />
            </div>
          )}

          {activeView === 'direction-a' && (
            <div className="w-full h-full">
              <DirectionAEmeraldMinbar data={mockDashboardData} onAction={(act) => setActiveView(act)} />
            </div>
          )}

          {activeView === 'direction-b' && (
            <div className="w-full h-full">
              <DirectionBModernNordic data={mockDashboardData} onAction={(act) => setActiveView(act)} />
            </div>
          )}

          {activeView === 'direction-c' && (
            <div className="w-full h-full">
              <DirectionCVibrantOasis data={mockDashboardData} onAction={(act) => setActiveView(act)} />
            </div>
          )}

          {activeView === 'settings' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
              <SettingsClient terms={mockSettingsTerms} />
            </div>
          )}

          {activeView === 'notifications' && (
            <div className="w-full h-full">
              <NotificationsClient initialNotifications={mockNotifications} initialActivities={mockActivities} />
            </div>
          )}

          {activeView === 'marks' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
              <AdminMarksEntryClient terms={mockTerms} />
            </div>
          )}

          {activeView === 'reports' && (
            <div className="w-full h-full">
              <ReportGeneratorClient terms={mockTerms} />
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function PreviewShellPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Loading preview canvas...</div>}>
      <PreviewShellContent />
    </Suspense>
  )
}
