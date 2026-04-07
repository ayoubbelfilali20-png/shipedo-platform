'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, LogOut } from 'lucide-react'

export default function ImpersonationBanner() {
  const router = useRouter()
  const [info, setInfo] = useState<{ name: string; role: string } | null>(null)

  useEffect(() => {
    try {
      const backup = localStorage.getItem('shipedo_admin_backup')
      const current = localStorage.getItem('shipedo_user')
      if (backup && current) {
        const u = JSON.parse(current)
        setInfo({ name: u.name || u.email || 'user', role: u.role })
      }
    } catch {}
  }, [])

  const exit = () => {
    try {
      const backup = localStorage.getItem('shipedo_admin_backup')
      if (backup) {
        localStorage.setItem('shipedo_user', backup)
        localStorage.removeItem('shipedo_admin_backup')
      }
    } catch {}
    router.push('/dashboard')
  }

  if (!info) return null

  return (
    <div className="sticky top-0 z-30 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-2 text-xs font-semibold min-w-0">
        <Eye size={14} className="flex-shrink-0" />
        <span className="truncate">
          Viewing as <strong>{info.name}</strong> ({info.role}) — admin mode
        </span>
      </div>
      <button
        onClick={exit}
        className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
      >
        <LogOut size={12} /> Exit
      </button>
    </div>
  )
}
