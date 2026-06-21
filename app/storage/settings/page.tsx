'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Mail } from 'lucide-react'
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

  return (
    <div className="p-6 space-y-4 max-w-md">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-xl font-bold text-amber-600">
            {(name || '?')[0]}
          </div>
          <div>
            <p className="font-bold text-[#1a1c3a]">{name}</p>
            <p className="text-xs text-gray-400">Storage Agent</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
            <User size={14} className="text-gray-400" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Name</p>
              <p className="text-xs text-[#1a1c3a] font-medium">{name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
            <Mail size={14} className="text-gray-400" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Email</p>
              <p className="text-xs text-[#1a1c3a] font-medium">{email}</p>
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => { clearUser('storage'); router.push('/login') }}
        className="flex items-center gap-2 px-5 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-bold rounded-xl w-full">
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  )
}
