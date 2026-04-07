'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import Sidebar from '@/components/dashboard/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar role="admin" collapsed={collapsed} onCollapsedChange={setCollapsed} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10">
            <Sidebar role="admin" collapsed={false} onCollapsedChange={() => {}} />
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Main content — shifts with sidebar */}
      <div
        className={`flex-1 min-h-screen overflow-x-hidden transition-all duration-300 ${collapsed ? 'lg:ml-[68px]' : 'lg:ml-[240px]'}`}
      >
        <div className="lg:hidden h-0" />
        {children}
        <footer className="px-6 py-4 border-t border-gray-100 bg-[#f8fafc]">
          <p className="text-xs text-gray-400 text-center">Copyright © 2026 Shipedo. All rights reserved</p>
        </footer>
      </div>
    </div>
  )
}
