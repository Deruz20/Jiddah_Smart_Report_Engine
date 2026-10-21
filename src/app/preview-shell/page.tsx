'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/figma-ui/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'

export default function PreviewShellPage() {
  const router = useRouter()

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.replace('/login')
    }
  }, [router])

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="h-screen bg-slate-50 dark:bg-[#0f172a] flex flex-col min-w-0 relative">
        <AppTopbar />
        <div className="p-6">
          <h1 className="text-xl font-bold text-slate-800">Mobile Navigation & Shell Test Canvas</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated verification harness for topbar actions, hamburger toggle, and mobile drawer accessibility.
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
