'use client'

import { useParams, useRouter } from 'next/navigation'
import { mockOrders } from '@/lib/data'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/dashboard/StatusBadge'
import Header from '@/components/dashboard/Header'
import {
  ArrowLeft, MapPin, Phone, Package, FileText,
  Clock, CheckCircle, Truck, RotateCcw, XCircle,
  ShoppingBag, CreditCard, User, Hash, Calendar,
  MessageSquare, Copy, Check
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { OrderStatus } from '@/lib/types'

const statusSteps: { key: OrderStatus; label: string; icon: React.ElementType }[] = [
  { key: 'pending',   label: 'Pending',   icon: Clock         },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle   },
  { key: 'shipped',   label: 'Shipped',   icon: Truck         },
  { key: 'delivered', label: 'Delivered', icon: ShoppingBag   },
]

const statusOrder: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered']

function getStepIndex(status: OrderStatus) {
  if (status === 'returned' || status === 'cancelled') return -1
  return statusOrder.indexOf(status)
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const order = mockOrders.find(o => o.id === id)

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Package size={48} className="text-gray-300" />
        <p className="text-gray-400 text-sm">Order not found</p>
        <button onClick={() => router.back()} className="text-[#f4991a] text-sm font-semibold hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const copyTracking = () => {
    navigator.clipboard.writeText(order.trackingNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentStep = getStepIndex(order.status)
  const isTerminal = order.status === 'returned' || order.status === 'cancelled'

  return (
    <div className="min-h-screen">
      <Header
        title="Order Detail"
        subtitle={order.trackingNumber}
        action={{ label: 'All Orders', href: '/dashboard/orders' }}
      />

      <div className="p-6 space-y-5 max-w-4xl">

        {/* Back + status row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a1c3a] transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <Link
              href={`/dashboard/invoices?order=${order.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1c3a] text-white text-sm font-semibold rounded-xl hover:bg-[#252750] transition-all"
            >
              <FileText size={14} />
              Invoice
            </Link>
          </div>
        </div>

        {/* Tracking + Payment */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Tracking Number</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-bold text-[#1a1c3a]">{order.trackingNumber}</span>
                <button
                  onClick={copyTracking}
                  className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-[#f4991a]/10 flex items-center justify-center text-gray-400 hover:text-[#f4991a] transition-all"
                  title="Copy tracking number"
                >
                  {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">{order.sellerName}</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Amount</p>
                <p className="text-lg font-bold text-[#f4991a]">KES {order.totalAmount.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Payment</p>
                <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${
                  order.paymentMethod === 'COD' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                }`}>{order.paymentMethod}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-5">Order Progress</h4>
          {isTerminal ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
              {order.status === 'returned'
                ? <RotateCcw size={20} className="text-red-500" />
                : <XCircle size={20} className="text-red-500" />
              }
              <div>
                <p className="font-semibold text-sm text-red-700 capitalize">{order.status}</p>
                <p className="text-xs text-red-400">This order has been {order.status}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-0">
              {statusSteps.map((step, i) => {
                const done = i <= currentStep
                const active = i === currentStep
                const Icon = step.icon
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        active ? 'bg-[#f4991a] text-white shadow-lg shadow-orange-200' :
                        done   ? 'bg-[#1a1c3a] text-white' :
                                 'bg-gray-100 text-gray-300'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <span className={`text-xs mt-2 font-medium whitespace-nowrap ${
                        active ? 'text-[#f4991a]' : done ? 'text-[#1a1c3a]' : 'text-gray-300'
                      }`}>{step.label}</span>
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all ${
                        i < currentStep ? 'bg-[#1a1c3a]' : 'bg-gray-100'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <User size={13} />
              Customer
            </h4>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center font-bold text-[#1a1c3a] text-sm flex-shrink-0">
                {order.customerName[0]}
              </div>
              <div>
                <div className="font-bold text-[#1a1c3a] text-sm">{order.customerName}</div>
                <div className="text-xs text-gray-400">{order.customerPhone}</div>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <Phone size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{order.customerPhone}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{order.customerAddress}, {order.customerCity}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5"><Calendar size={12} /> Created</span>
                <span className="font-medium text-gray-600">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5"><Clock size={12} /> Updated</span>
                <span className="font-medium text-gray-600">{formatDate(order.updatedAt)}</span>
              </div>
              {order.deliveredAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1.5"><CheckCircle size={12} /> Delivered</span>
                  <span className="font-medium text-green-600">{formatDate(order.deliveredAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Meta */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Hash size={13} />
              Order Info
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-xs text-gray-400">Seller</span>
                <span className="text-xs font-semibold text-[#1a1c3a]">{order.sellerName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-xs text-gray-400">Payment</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  order.paymentMethod === 'COD' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                }`}>{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-xs text-gray-400">COD Amount</span>
                <span className="text-xs font-semibold text-[#1a1c3a]">KES {order.codAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-xs text-gray-400">Call Attempts</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(order.callAttempts, 5) }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-[#f4991a]" />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">{order.callAttempts}</span>
                </div>
              </div>
              {order.notes && (
                <div className="pt-1">
                  <span className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                    <MessageSquare size={12} /> Notes
                  </span>
                  <p className="text-xs text-gray-600 bg-yellow-50 border border-yellow-100 rounded-xl p-3 leading-relaxed">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Package size={13} />
            Products ({order.products.length})
          </h4>
          <div className="space-y-2">
            {order.products.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                    <Package size={16} className="text-gray-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1a1c3a]">{p.name}</div>
                    {p.sku && <div className="text-xs text-gray-400">SKU: {p.sku}</div>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#1a1c3a]">KES {(p.price * p.quantity).toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{p.quantity} × KES {p.price.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>KES {order.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Shipping</span>
              <span className="text-green-600 font-medium">Included</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#1a1c3a] pt-2 border-t border-gray-100">
              <span>Total</span>
              <span className="text-[#f4991a]">KES {order.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pb-6">
          <Link
            href={`/dashboard/invoices?order=${order.id}`}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1a1c3a] text-white text-sm font-semibold py-3.5 rounded-xl hover:bg-[#252750] transition-all"
          >
            <FileText size={16} />
            View Invoice
          </Link>
          <a
            href={`tel:${order.customerPhone}`}
            className="flex items-center justify-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium py-3.5 px-5 rounded-xl hover:bg-gray-50 transition-all"
          >
            <Phone size={16} />
            Call Customer
          </a>
          <Link
            href="/dashboard/orders"
            className="flex items-center justify-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium py-3.5 px-5 rounded-xl hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={16} />
            Back to Orders
          </Link>
        </div>
      </div>
    </div>
  )
}
