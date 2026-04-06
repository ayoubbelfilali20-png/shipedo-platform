'use client'

import { useState } from 'react'
import { User, Phone, Mail, Lock, Eye, EyeOff, Save, CheckCircle } from 'lucide-react'

export default function AgentSettingsPage() {
  const [name, setName] = useState('Yassine Belfilali')
  const [email, setEmail] = useState('yassine@shipedo.com')
  const [phone, setPhone] = useState('+254700000001')
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const field = (label: string, value: string, onChange: (v: string) => void, type = 'text', icon?: React.ReactNode) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full ${icon ? 'pl-9' : 'pl-3.5'} pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all`}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="font-bold text-[#1a1c3a] text-lg">Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Manage your account</p>
      </div>

      <div className="px-6 pt-5 pb-10 max-w-xl space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-[#1a1c3a] text-sm flex items-center gap-2">
            <User size={15} className="text-[#f4991a]" /> Profile
          </h3>
          {field('Full Name', name, setName, 'text', <User size={14} />)}
          {field('Email', email, setEmail, 'email', <Mail size={14} />)}
          {field('Phone', phone, setPhone, 'tel', <Phone size={14} />)}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-[#1a1c3a] text-sm flex items-center gap-2">
            <Lock size={15} className="text-[#f4991a]" /> Change Password
          </h3>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Current Password</label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]" />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]" />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-[#1a1c3a] hover:bg-[#252750] text-white text-sm font-bold rounded-xl transition-all"
        >
          {saved ? <><CheckCircle size={15} /> Saved!</> : <><Save size={15} /> Save Changes</>}
        </button>
      </div>
    </div>
  )
}
