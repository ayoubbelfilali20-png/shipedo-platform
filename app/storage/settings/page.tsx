'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { clearUser } from '@/lib/auth'

export default function StorageSettingsPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('shipedo_storage')
      if (stored) {
        const u = JSON.parse(stored)
        setName(u.name || '')
        setEmail(u.email || '')
      }
    } catch {}
  }, [])

  const logout = () => {
    clearUser('storage')
    router.push('/login')
  }

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-[#1a1c3a]">Profile</h2>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <User size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1a1c3a]">{name}</p>
            <p className="text-xs text-gray-400">{email}</p>
          </div>
        </div>
      </div>

      <button onClick={logout}
        className="flex items-center gap-2 px-5 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-bold rounded-xl transition-all w-full">
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  )
}
