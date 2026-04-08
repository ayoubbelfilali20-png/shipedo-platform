'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import {
  User, Mail, Phone, MapPin, Lock, Eye, EyeOff,
  Save, CheckCircle, CreditCard, Smartphone,
  Plus, ShieldCheck, Camera, Headphones
} from 'lucide-react'

const paymentMethods = [
  { id: 'pm1', type: 'mpesa', label: 'M-Pesa', account: '+254 700 000 001', name: 'Yassine Belfilali', primary: true },
]

const methodIcons: Record<string, { emoji: string; color: string; bg: string }> = {
  mpesa:  { emoji: '📱', color: 'text-green-700',  bg: 'bg-green-50 border-green-100'   },
  paypal: { emoji: '💳', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100'    },
  bank:   { emoji: '🏦', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
}

function Field({ label, value, onChange, type = 'text', icon: Icon }: {
  label: string; value: string; onChange?: (v: string) => void; type?: string; icon?: React.ElementType
}) {
  const [show, setShow] = useState(false)
  const isPass = type === 'password'
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />}
        <input
          type={isPass ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} ${isPass ? 'pr-10' : 'pr-4'} py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all bg-white`}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

export default function AgentProfilePage() {
  const [saved, setSaved] = useState(false)
  const [methods, setMethods] = useState<typeof paymentMethods>([])
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', city: '' })
  const [agentId, setAgentId] = useState<string | null>(null)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [saving, setSaving] = useState(false)
  const setField = (k: keyof typeof profile) => (v: string) => setProfile(p => ({ ...p, [k]: v }))

  useEffect(() => {
    try {
      const stored = localStorage.getItem('shipedo_agent')
      if (!stored) return
      const u = JSON.parse(stored)
      if (u.role !== 'agent' || !u.id) return
      setAgentId(u.id)
      supabase.from('agents').select('*').eq('id', u.id).single().then(({ data }) => {
        if (data) setProfile({
          name: data.name || '', email: data.email || '',
          phone: data.phone || '', city: data.city || '',
        })
      })
    } catch {}
  }, [])

  const setPrimary = (id: string) => setMethods(m => m.map(p => ({ ...p, primary: p.id === id })))
  const remove = (id: string) => setMethods(m => m.filter(p => p.id !== id))

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header title="Profile" subtitle="Your personal information & payment methods" role="agent" />

      <div className="p-6 space-y-5 max-w-2xl">

        {/* Avatar hero */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {(profile.name || 'A')[0]?.toUpperCase()}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#1a1c3a] rounded-xl flex items-center justify-center text-white hover:bg-[#252750] transition-all shadow">
              <Camera size={13} />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1a1c3a]">{profile.name || '—'}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{profile.email || '—'}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              <Headphones size={11} /> Call Agent
            </span>
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-[#f4991a]" />
            <h3 className="font-bold text-[#1a1c3a]">Personal Information</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name"  value={profile.name}  onChange={setField('name')}  icon={User}  />
            <Field label="Email"      value={profile.email} onChange={setField('email')} type="email" icon={Mail}  />
            <Field label="Phone"      value={profile.phone} onChange={setField('phone')} type="tel"   icon={Phone} />
            <Field label="City"       value={profile.city}  onChange={setField('city')}  icon={MapPin} />
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={16} className="text-[#f4991a]" />
            <h3 className="font-bold text-[#1a1c3a]">Security</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Current Password" value={currentPwd} onChange={setCurrentPwd} type="password" />
            <Field label="New Password"     value={newPwd}     onChange={setNewPwd}     type="password" />
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-[#f4991a]" />
              <h3 className="font-bold text-[#1a1c3a]">Payment Methods</h3>
            </div>
            <button className="flex items-center gap-1.5 text-xs font-semibold text-[#f4991a] hover:text-orange-600 transition-colors">
              <Plus size={13} /> Add Method
            </button>
          </div>
          <div className="space-y-3">
            {methods.map(m => {
              const cfg = methodIcons[m.type]
              return (
                <div key={m.id} className={`flex items-center gap-4 p-4 rounded-xl border ${m.primary ? 'border-[#f4991a]/30 bg-orange-50/40' : 'border-gray-100 bg-gray-50/50'}`}>
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xl flex-shrink-0 ${cfg.bg}`}>{cfg.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${cfg.color}`}>{m.label}</span>
                      {m.primary && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#f4991a]/10 text-[#f4991a] rounded-full flex items-center gap-1">
                          <ShieldCheck size={9} /> Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{m.account}</p>
                    <p className="text-xs text-gray-400">{m.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!m.primary && <button onClick={() => setPrimary(m.id)} className="text-xs text-gray-400 hover:text-[#f4991a] font-semibold transition-colors">Set primary</button>}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5">
            <Smartphone size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600">Your <strong>primary</strong> method is used for salary & commission payouts.</p>
          </div>
        </div>

        <div className="flex justify-end pb-4">
          <button
            disabled={saving || !agentId}
            onClick={async () => {
              if (!agentId) return
              setSaving(true)
              const update: any = {
                name: profile.name, email: profile.email,
                phone: profile.phone, city: profile.city,
              }
              if (newPwd && currentPwd) {
                const { data: row } = await supabase.from('agents').select('password').eq('id', agentId).single()
                if (row && row.password !== currentPwd) {
                  alert('Current password is incorrect')
                  setSaving(false)
                  return
                }
                update.password = newPwd
              }
              const { error } = await supabase.from('agents').update(update).eq('id', agentId)
              setSaving(false)
              if (error) { alert('Save failed: ' + error.message); return }
              try {
                const u = JSON.parse(localStorage.getItem('shipedo_agent') || '{}')
                localStorage.setItem('shipedo_agent', JSON.stringify({ ...u, name: profile.name, email: profile.email }))
              } catch {}
              setCurrentPwd(''); setNewPwd('')
              setSaved(true); setTimeout(() => setSaved(false), 2500)
            }}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-60 ${saved ? 'bg-emerald-500' : 'bg-[#1a1c3a] hover:bg-[#252750]'}`}
          >
            {saving ? 'Saving…' : saved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  )
}
