'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import {
  User, Mail, Phone, MapPin, Store, Lock, Eye, EyeOff,
  Save, CheckCircle, CreditCard, Smartphone,
  Plus, Trash2, ShieldCheck, Camera, X, ChevronRight,
  Building2, Hash,
} from 'lucide-react'

/* ── Payment method types ───────────────────────── */
type MethodType = 'moroccan_iban' | 'binance' | 'red_to_pay'

interface PayMethod {
  id: string
  type: MethodType
  label: string
  account: string
  name: string
  primary: boolean
}

const initialMethods: PayMethod[] = [
  { id: 'pm1', type: 'moroccan_iban', label: 'Moroccan Bank (IBAN)', account: 'MA64 0110 0013 2121 2121 2121 214', name: 'Yassine Belfilali', primary: true  },
  { id: 'pm2', type: 'binance',       label: 'Binance ID',            account: '123456789',                       name: 'Yassine B.',        primary: false },
]

const methodConfig: Record<MethodType, { emoji: string; color: string; bg: string; border: string }> = {
  moroccan_iban: { emoji: '🏦', color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-100' },
  binance:       { emoji: '🟡', color: 'text-yellow-700',  bg: 'bg-yellow-50',   border: 'border-yellow-100'  },
  red_to_pay:    { emoji: '💳', color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-100'     },
}

const addOptions: { type: MethodType; label: string; desc: string; emoji: string; fields: { key: string; label: string; placeholder: string }[] }[] = [
  {
    type: 'moroccan_iban',
    label: 'Moroccan Bank Account',
    desc: 'IBAN — CIH, Attijariwafa, BMCE, BCP...',
    emoji: '🏦',
    fields: [
      { key: 'iban',  label: 'IBAN',         placeholder: 'MA64 XXXX XXXX XXXX XXXX XXXX XXX' },
      { key: 'bank',  label: 'Bank Name',    placeholder: 'e.g. CIH Bank' },
      { key: 'name',  label: 'Account Name', placeholder: 'Full name as on account' },
    ],
  },
  {
    type: 'binance',
    label: 'Binance ID',
    desc: 'Receive USDT directly to your Binance account',
    emoji: '🟡',
    fields: [
      { key: 'uid',  label: 'Binance UID',    placeholder: 'e.g. 123456789' },
      { key: 'name', label: 'Account Name',   placeholder: 'Name on Binance account' },
    ],
  },
  {
    type: 'red_to_pay',
    label: 'IBAN Red to Pay',
    desc: 'Red by Société Générale Morocco',
    emoji: '💳',
    fields: [
      { key: 'iban',  label: 'IBAN',         placeholder: 'MA64 XXXX XXXX XXXX XXXX XXXX XXX' },
      { key: 'name',  label: 'Account Name', placeholder: 'Full name as on account' },
      { key: 'phone', label: 'Phone',        placeholder: '+212 6XX XXX XXX' },
    ],
  },
]

/* ── Add Method Modal ───────────────────────────── */
function AddMethodModal({ onClose, onAdd }: {
  onClose: () => void
  onAdd: (m: PayMethod) => void
}) {
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  const [selected, setSelected] = useState<typeof addOptions[0] | null>(null)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const handlePick = (opt: typeof addOptions[0]) => {
    setSelected(opt)
    setVals({})
    setStep('form')
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const account = vals[selected.fields[0].key] || ''
    const name = vals['name'] || vals['uid'] || ''
    onAdd({
      id: 'pm' + Date.now(),
      type: selected.type,
      label: selected.label,
      account,
      name,
      primary: false,
    })
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            {step === 'form' && (
              <button onClick={() => setStep('pick')} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
                <ChevronRight size={14} className="text-gray-500 rotate-180" />
              </button>
            )}
            <div>
              <h2 className="font-bold text-[#1a1c3a] text-sm">
                {step === 'pick' ? 'Add Payment Method' : selected?.label}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {step === 'pick' ? 'Choose a method to add' : selected?.desc}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
            <X size={15} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          {step === 'pick' && (
            <div className="space-y-3">
              {addOptions.map(opt => {
                const cfg = methodConfig[opt.type]
                return (
                  <button
                    key={opt.type}
                    onClick={() => handlePick(opt)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-[#f4991a]/30 hover:bg-orange-50/30 transition-all group text-left"
                  >
                    <div className={`w-12 h-12 rounded-xl border ${cfg.border} ${cfg.bg} flex items-center justify-center text-2xl flex-shrink-0`}>
                      {opt.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold ${cfg.color}`}>{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-[#f4991a] transition-colors flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}

          {step === 'form' && selected && (
            <form onSubmit={handleAdd} className="space-y-4">
              {/* Method badge */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${methodConfig[selected.type].border} ${methodConfig[selected.type].bg}`}>
                <span className="text-2xl">{selected.emoji}</span>
                <div>
                  <div className={`text-sm font-bold ${methodConfig[selected.type].color}`}>{selected.label}</div>
                  <div className="text-xs text-gray-500">{selected.desc}</div>
                </div>
              </div>

              {selected.fields.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">{f.label}</label>
                  <input
                    type="text"
                    value={vals[f.key] || ''}
                    onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                  />
                </div>
              ))}

              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all ${saved ? 'bg-emerald-500' : 'bg-[#f4991a] hover:bg-orange-500'}`}
              >
                {saved ? <><CheckCircle size={16} /> Added!</> : <><Plus size={16} /> Add Method</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Field ──────────────────────────────────────── */
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

/* ── Page ───────────────────────────────────────── */
export default function SellerProfilePage() {
  const [saved, setSaved] = useState(false)
  const [methods, setMethods] = useState<PayMethod[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [profile, setProfile] = useState({
    name: '', company: '', email: '', phone: '', city: '', address: '',
  })
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [saving, setSaving] = useState(false)
  const [sellerId, setSellerId] = useState<string | null>(null)
  const setField = (k: keyof typeof profile) => (v: string) => setProfile(p => ({ ...p, [k]: v }))

  useEffect(() => {
    try {
      const stored = localStorage.getItem('shipedo_seller')
      if (!stored) return
      const u = JSON.parse(stored)
      if (u.role !== 'seller' || !u.id) return
      setSellerId(u.id)
      supabase.from('sellers').select('*').eq('id', u.id).single().then(({ data }) => {
        if (data) {
          setProfile({
            name: data.name || '',
            company: data.company || '',
            email: data.email || '',
            phone: data.phone || '',
            city: data.city || '',
            address: data.address || '',
          })
          if (Array.isArray(data.payment_methods)) setMethods(data.payment_methods)
        }
      })
    } catch {}
  }, [])

  const persistMethods = async (next: PayMethod[]) => {
    setMethods(next)
    if (sellerId) {
      await supabase.from('sellers').update({ payment_methods: next }).eq('id', sellerId)
    }
  }

  const setPrimary = (id: string) => persistMethods(methods.map(p => ({ ...p, primary: p.id === id })))
  const remove = (id: string) => persistMethods(methods.filter(p => p.id !== id))
  const addMethod = (m: PayMethod) => persistMethods([...methods, m])

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header title="Profile" subtitle="Your personal information & payment methods" role="seller" />

      <div className="p-6 space-y-5 max-w-2xl">

        {/* Avatar hero */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#f4991a] to-orange-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">{(profile.name || profile.company || 'S')[0]?.toUpperCase()}</div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#1a1c3a] rounded-xl flex items-center justify-center text-white hover:bg-[#252750] transition-all shadow">
              <Camera size={13} />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1a1c3a]">{profile.name || '—'}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{profile.email || '—'}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700">
              <Store size={11} /> Seller {profile.company && `· ${profile.company}`}
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
            <Field label="Full Name"  value={profile.name}    onChange={setField('name')}    icon={User}   />
            <Field label="Store Name" value={profile.company} onChange={setField('company')} icon={Store}  />
            <Field label="Email"      value={profile.email}   onChange={setField('email')}   type="email" icon={Mail}  />
            <Field label="Phone"      value={profile.phone}   onChange={setField('phone')}   type="tel"   icon={Phone} />
            <Field label="City"       value={profile.city}    onChange={setField('city')}    icon={MapPin} />
            <Field label="Address"    value={profile.address} onChange={setField('address')} icon={MapPin} />
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
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#f4991a] hover:text-orange-600 transition-colors"
            >
              <Plus size={13} /> Add Method
            </button>
          </div>

          <div className="space-y-3">
            {methods.map(m => {
              const cfg = methodConfig[m.type]
              return (
                <div key={m.id} className={`flex items-center gap-4 p-4 rounded-xl border ${m.primary ? 'border-[#f4991a]/30 bg-orange-50/40' : 'border-gray-100 bg-gray-50/50'}`}>
                  <div className={`w-11 h-11 rounded-xl border ${cfg.border} ${cfg.bg} flex items-center justify-center text-xl flex-shrink-0`}>
                    {cfg.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${cfg.color}`}>{m.label}</span>
                      {m.primary && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#f4991a]/10 text-[#f4991a] rounded-full flex items-center gap-1">
                          <ShieldCheck size={9} /> Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{m.account}</p>
                    <p className="text-xs text-gray-400">{m.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!m.primary && (
                      <button onClick={() => setPrimary(m.id)} className="text-xs text-gray-400 hover:text-[#f4991a] font-semibold transition-colors whitespace-nowrap">
                        Set primary
                      </button>
                    )}
                    {!m.primary && (
                      <button onClick={() => remove(m.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 transition-all">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5">
            <Smartphone size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600">
              Your <strong>primary</strong> method is used for automatic payouts. Withdrawals can be sent to any method.
            </p>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end pb-4">
          <button
            disabled={saving || !sellerId}
            onClick={async () => {
              if (!sellerId) return
              setSaving(true)
              const update: any = {
                name: profile.name,
                company: profile.company,
                email: profile.email,
                phone: profile.phone,
                city: profile.city,
                address: profile.address,
              }
              if (newPwd && currentPwd) {
                const { data: row } = await supabase.from('sellers').select('password').eq('id', sellerId).single()
                if (row && row.password !== currentPwd) {
                  alert('Current password is incorrect')
                  setSaving(false)
                  return
                }
                update.password = newPwd
              }
              const { error } = await supabase.from('sellers').update(update).eq('id', sellerId)
              setSaving(false)
              if (error) { alert('Save failed: ' + error.message); return }
              try {
                const u = JSON.parse(localStorage.getItem('shipedo_seller') || '{}')
                localStorage.setItem('shipedo_seller', JSON.stringify({ ...u, name: profile.company || profile.name, fullName: profile.name, email: profile.email }))
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

      {showAddModal && <AddMethodModal onClose={() => setShowAddModal(false)} onAdd={addMethod} />}
    </div>
  )
}
