'use client'

import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import {
  Bell, Shield, Globe, Palette, Mail, Phone, Save,
  User, Building, Key, Smartphone, CheckCircle
} from 'lucide-react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [emailNotifs, setEmailNotifs] = useState({
    orderConfirmed: true,
    orderShipped: true,
    orderDelivered: true,
    codCollected: true,
    dailySummary: true,
    returnRequests: false,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen">
      <Header title="Settings" subtitle="Platform configuration & preferences" />

      <div className="p-6 space-y-6 max-w-3xl">
        {/* Company profile */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Building size={18} className="text-[#f4991a]" />
            <h2 className="text-base font-bold text-[#1a1c3a]">Company Profile</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: 'Company Name', value: 'Shipedo Kenya', type: 'text' },
              { label: 'Email', value: 'admin@shipedo.co.ke', type: 'email' },
              { label: 'Phone', value: '+254 700 000 000', type: 'tel' },
              { label: 'Location', value: 'Nairobi, Kenya', type: 'text' },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  defaultValue={f.value}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Bell size={18} className="text-[#f4991a]" />
            <h2 className="text-base font-bold text-[#1a1c3a]">Email Notifications</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: 'orderConfirmed', label: 'Order Confirmed', desc: 'Send email when call center confirms an order' },
              { key: 'orderShipped', label: 'Order Shipped', desc: 'Notify customer when order is dispatched' },
              { key: 'orderDelivered', label: 'Order Delivered', desc: 'Send invoice PDF when order is delivered' },
              { key: 'codCollected', label: 'COD Collected', desc: 'Notify seller when cash is collected' },
              { key: 'dailySummary', label: 'Daily Summary (Admin)', desc: 'Send daily report to admin at end of day' },
              { key: 'returnRequests', label: 'Return Requests', desc: 'Alert when customer initiates a return' },
            ].map((notif) => (
              <div key={notif.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-[#1a1c3a]">{notif.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{notif.desc}</div>
                </div>
                <button
                  onClick={() => setEmailNotifs({ ...emailNotifs, [notif.key]: !emailNotifs[notif.key as keyof typeof emailNotifs] })}
                  className={`w-12 h-6 rounded-full transition-all duration-200 relative flex-shrink-0 ${
                    emailNotifs[notif.key as keyof typeof emailNotifs] ? 'bg-[#f4991a]' : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                    emailNotifs[notif.key as keyof typeof emailNotifs] ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery settings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Globe size={18} className="text-[#f4991a]" />
            <h2 className="text-base font-bold text-[#1a1c3a]">Delivery Configuration</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: 'Default Delivery Fee (KES)', value: '350' },
              { label: 'Express Delivery Fee (KES)', value: '650' },
              { label: 'Max Call Attempts', value: '3' },
              { label: 'COD Payout Cycle (days)', value: '7' },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{f.label}</label>
                <input
                  type="number"
                  defaultValue={f.value}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-[#f4991a]" />
            <h2 className="text-base font-bold text-[#1a1c3a]">Security</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Current Password', type: 'password', placeholder: '••••••••' },
              { label: 'New Password', type: 'password', placeholder: '••••••••' },
              { label: 'Confirm New Password', type: 'password', placeholder: '••••••••' },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-white text-sm font-semibold transition-all ${
              saved
                ? 'bg-emerald-500 scale-105'
                : 'bg-[#1a1c3a] hover:bg-[#252750] hover:scale-105'
            }`}
          >
            {saved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  )
}
