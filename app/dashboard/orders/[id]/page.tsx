'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Phone, MapPin, Package, Save, Pencil, Printer } from 'lucide-react'
import { printOrderLabel } from '@/components/PrintLabel'
import { cn } from '@/lib/utils'

type OrderRow = {
  id: string
  tracking_number: string
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  items: any[]
  total_amount: number
  original_total?: number | null
  status: string
  payment_method: string
  notes?: string | null
  call_attempts?: number | null
  reminded_at?: string | null
  last_call_note?: string | null
  created_at: string
  seller_id?: string | null
}

const statusOptions = ['pending', 'confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned', 'cancelled']

const statusColors: Record<string, string> = {
  pending:          'bg-rose-50 text-rose-600 border-rose-300',
  confirmed:        'bg-emerald-50 text-emerald-600 border-emerald-400',
  prepared:         'bg-indigo-50 text-indigo-600 border-indigo-300',
  shipped_to_agent: 'bg-purple-50 text-purple-600 border-purple-300',
  shipped:          'bg-blue-50 text-blue-600 border-blue-300',
  delivered:        'bg-sky-50 text-sky-600 border-sky-300',
  returned:         'bg-red-50 text-red-600 border-red-300',
  cancelled:        'bg-gray-50 text-gray-500 border-gray-300',
}

const statusLabelsAdmin: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', prepared: 'Prepared',
  shipped_to_agent: 'Sent to Agent', shipped: 'Shipped',
  delivered: 'Delivered', returned: 'Returned', cancelled: 'Cancelled',
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<OrderRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('pending')

  const refresh = async () => {
    if (!id) return
    const { data } = await supabase.from('orders').select('*').eq('id', id).limit(1)
    const row = data?.[0] as OrderRow | undefined
    if (row) {
      setOrder(row)
      setName(row.customer_name || '')
      setPhone(row.customer_phone || '')
      setCity(row.customer_city || '')
      setAddress(row.customer_address || '')
      setNotes(row.notes || '')
      setStatus(row.status || 'pending')
    }
    setLoading(false)
  }

  useEffect(() => { refresh() }, [id])

  const save = async () => {
    if (!order) return
    setSaving(true)
    await supabase.from('orders').update({
      customer_name: name,
      customer_phone: phone,
      customer_city: city,
      customer_address: address,
      notes,
      status,
    }).eq('id', order.id)
    setSaving(false)
    setEditing(false)
    refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#f4991a] rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex flex-col items-center justify-center gap-4">
        <Package size={48} className="text-gray-300" />
        <p className="text-gray-400 text-sm">Order not found</p>
        <Link href="/dashboard/orders" className="text-[#f4991a] text-sm font-semibold hover:underline">
          Back to orders
        </Link>
      </div>
    )
  }

  const inputCls = cn(
    'w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition-all',
    editing ? 'bg-white border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' : 'bg-gray-50 border-gray-200'
  )

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Header title="Order Detail" subtitle={order.tracking_number} role="admin" />

      <div className="px-6 pt-6 pb-10 max-w-4xl space-y-5">
        {order.status === 'cancelled' && (order as any).cancel_reason && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 flex items-start gap-2">
            <span className="font-bold uppercase tracking-wide">Cancel reason:</span>
            <span>{(order as any).cancel_reason}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => router.push('/dashboard/orders')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a1c3a]">
            <ArrowLeft size={16} /> Back to orders
          </button>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border-2 whitespace-nowrap', statusColors[order.status] || statusColors.pending)}>
              {statusLabelsAdmin[order.status] || order.status}
            </span>
            {order.status === 'confirmed' && (
              <button
                onClick={async () => {
                  await supabase.from('orders').update({ status: 'prepared' }).eq('id', order.id)
                  printOrderLabel({
                    tracking: order.tracking_number,
                    customerName: order.customer_name,
                    customerPhone: order.customer_phone,
                    customerAddress: order.customer_address,
                    customerCity: order.customer_city,
                    items: Array.isArray(order.items) ? order.items : [],
                    totalAmount: order.total_amount,
                    paymentMethod: order.payment_method,
                  })
                  refresh()
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all"
              >
                <Printer size={13} /> Prepare & Print
              </button>
            )}
            <button
              onClick={() => {
                printOrderLabel({
                  tracking: order.tracking_number,
                  customerName: order.customer_name,
                  customerPhone: order.customer_phone,
                  customerAddress: order.customer_address,
                  customerCity: order.customer_city,
                  items: Array.isArray(order.items) ? order.items : [],
                  totalAmount: order.total_amount,
                  paymentMethod: order.payment_method,
                })
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-all"
            >
              <Printer size={13} /> Print
            </button>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-all"
              >
                <Pencil size={13} /> Edit
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setEditing(false); setName(order.customer_name); setPhone(order.customer_phone); setCity(order.customer_city); setAddress(order.customer_address); setNotes(order.notes || ''); setStatus(order.status) }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-60"
                >
                  {saving ? 'Saving…' : <><Save size={13} /> Save</>}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-[#1a1c3a] mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} disabled={!editing} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><Phone size={11} /> Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} disabled={!editing} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><MapPin size={11} /> City</label>
              <input value={city} onChange={e => setCity(e.target.value)} disabled={!editing} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} disabled={!editing} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} disabled={!editing} className={inputCls}>
                {statusOptions.map(s => <option key={s} value={s}>{statusLabelsAdmin[s] || s}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={!editing} rows={2} className={cn(inputCls, 'resize-none')} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-[#1a1c3a] mb-4">Items</h2>
          <div className="space-y-2">
            {(Array.isArray(order.items) ? order.items : []).map((it: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package size={14} className="text-[#f4991a]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1a1c3a] truncate">{it.name || 'Item'}</p>
                    <p className="text-xs text-gray-400 font-mono">{it.sku || '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#1a1c3a]">×{it.quantity || 1}</p>
                  <p className="text-xs text-gray-400">KES {((Number(it.unit_price) || Number(it.price) || 0) * (Number(it.quantity) || 1)).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-600">Total</span>
            <span className="text-lg font-bold text-[#f4991a]">
              KES {(order.total_amount || 0).toLocaleString()}
              {order.original_total && order.original_total !== order.total_amount && order.original_total > 0 && (
                <span className="text-xs text-gray-400 line-through ml-2">KES {order.original_total.toLocaleString()}</span>
              )}
            </span>
          </div>
        </div>

        {(order.call_attempts || 0) > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-[#1a1c3a] mb-3">Call Center Activity</h2>
            <div className="space-y-2 text-xs text-gray-600">
              <p><strong>Attempts:</strong> {order.call_attempts}</p>
              {order.reminded_at && <p><strong>Reminder set for:</strong> {new Date(order.reminded_at).toLocaleString()}</p>}
              {order.last_call_note && <p className="bg-gray-50 p-3 rounded-lg"><strong>Last note:</strong> {order.last_call_note}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
