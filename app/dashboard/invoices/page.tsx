'use client'

import { useState, useRef } from 'react'
import Header from '@/components/dashboard/Header'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { mockOrders } from '@/lib/data'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Order } from '@/lib/types'
import {
  FileText, Download, Eye, Search, Filter,
  Printer, Mail, CheckCircle, Package, MapPin,
  Phone, Truck, X, QrCode, Shield
} from 'lucide-react'

function InvoicePreview({ order, onClose }: { order: Order; onClose: () => void }) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const invoiceNumber = `INV-${order.trackingNumber.replace('SHP-', '')}`
  const invoiceDate = formatDate(order.createdAt)
  const deliveryFee = 350
  const subtotal = order.totalAmount
  const total = subtotal + deliveryFee

  const handlePrint = () => {
    const content = invoiceRef.current
    if (!content) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoiceNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', Arial, sans-serif; color: #1a1c3a; }
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        {/* Modal actions */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#f4991a]" />
            <span className="font-bold text-[#1a1c3a] text-sm">{invoiceNumber}</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1c3a] text-white text-xs font-semibold rounded-xl hover:bg-[#252750] transition-all"
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={() => {}}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#f4991a] text-white text-xs font-semibold rounded-xl hover:bg-[#f8b44a] transition-all"
            >
              <Download size={14} /> Download
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-all"
            >
              <X size={16} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Invoice content */}
        <div ref={invoiceRef} className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-[#f4991a] rounded-xl flex items-center justify-center">
                  <Truck size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-[#1a1c3a] text-xl">Shipedo</div>
                  <div className="text-xs text-gray-400">Logistics Platform</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>Nairobi, Kenya</div>
                <div>info@shipedo.co.ke | +254 700 000 000</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#1a1c3a] mb-1">INVOICE</div>
              <div className="text-sm font-mono text-[#f4991a] font-bold">{invoiceNumber}</div>
              <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                <div>Date: {invoiceDate}</div>
                <div>Tracking: <span className="font-mono font-semibold">{order.trackingNumber}</span></div>
              </div>
            </div>
          </div>

          {/* Divider with color */}
          <div className="h-1 w-full rounded-full mb-6 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-[#1a1c3a] via-[#f4991a] to-[#1a1c3a]" />
          </div>

          {/* Bill To + Ship To */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="font-bold text-[#1a1c3a]">{order.customerName}</div>
                <div className="text-sm text-gray-500 mt-1">{order.customerPhone}</div>
                <div className="text-sm text-gray-500 mt-1 leading-relaxed">{order.customerAddress}</div>
                <div className="text-sm text-gray-500">{order.customerCity}, Kenya</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Order Info</div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Payment:</span>
                  <span className="font-semibold text-[#1a1c3a]">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Prepaid'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Seller:</span>
                  <span className="font-semibold text-[#1a1c3a]">{order.sellerName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="mb-6">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Items</div>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#1a1c3a] text-white">
                    <th className="text-left text-xs font-semibold px-4 py-3">Product</th>
                    <th className="text-center text-xs font-semibold px-3 py-3">Qty</th>
                    <th className="text-right text-xs font-semibold px-3 py-3">Unit Price</th>
                    <th className="text-right text-xs font-semibold px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.products.map((product, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[#1a1c3a]">{product.name}</div>
                        {product.sku && <div className="text-xs text-gray-400 font-mono">SKU: {product.sku}</div>}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-600">{product.quantity}</td>
                      <td className="px-3 py-3 text-right text-sm text-gray-600">KES {product.price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-[#1a1c3a]">
                        KES {(product.price * product.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-[#1a1c3a]">KES {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery Fee</span>
                <span className="text-[#1a1c3a]">KES {deliveryFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between">
                  <span className="font-bold text-[#1a1c3a]">Total</span>
                  <span className="font-bold text-[#f4991a] text-lg">KES {total.toLocaleString()}</span>
                </div>
                {order.paymentMethod === 'COD' && (
                  <div className="mt-1 text-xs text-gray-400">Payable on delivery (Cash)</div>
                )}
              </div>
            </div>
          </div>

          {/* QR Code + Tracking */}
          <div className="bg-gradient-to-r from-[#1a1c3a] to-[#252750] rounded-xl p-4 flex items-center gap-4">
            <div className="bg-white rounded-lg p-2 flex-shrink-0">
              <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center">
                <QrCode size={40} className="text-[#1a1c3a]" />
              </div>
            </div>
            <div>
              <div className="text-white font-bold text-sm mb-1">Track Your Order</div>
              <div className="text-white/60 text-xs mb-2">Scan QR or use tracking number below</div>
              <div className="font-mono text-[#f4991a] font-bold text-sm">{order.trackingNumber}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="flex items-center gap-1.5 text-white/60 text-xs">
                <Shield size={12} />
                <span>Secure delivery</span>
              </div>
              <div className="text-white/40 text-xs mt-1">shipedo.co.ke</div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Thank you for shopping with us! For support: <span className="text-[#f4991a]">support@shipedo.co.ke</span> | +254 700 000 000
            </p>
            <p className="text-xs text-gray-300 mt-1">This is a computer-generated invoice. No signature required.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [sentEmails, setSentEmails] = useState<Set<string>>(new Set())

  const filtered = mockOrders.filter((o) =>
    o.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.toLowerCase().includes(search.toLowerCase()) ||
    o.sellerName.toLowerCase().includes(search.toLowerCase())
  )

  const handleSendEmail = (orderId: string) => {
    setSentEmails(new Set([...sentEmails, orderId]))
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Invoices"
        subtitle={`${mockOrders.length} invoices generated`}
      />

      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Invoices', value: mockOrders.length, color: 'text-[#f4991a]', bg: 'bg-orange-50' },
            { label: 'Emails Sent', value: sentEmails.size, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Delivered w/ Invoice', value: mockOrders.filter(o => o.status === 'delivered').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending Send', value: mockOrders.filter(o => o.status === 'confirmed' && !sentEmails.has(o.id)).length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-5 border border-transparent`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Email templates showcase */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#1a1c3a] mb-4 flex items-center gap-2">
            <Mail size={18} className="text-[#f4991a]" />
            Automated Email Notifications
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                stage: 'Order Confirmed',
                desc: 'Sent immediately after call center confirms the order',
                icon: CheckCircle,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                border: 'border-blue-100',
                subject: '✅ Your order has been confirmed – Shipedo',
              },
              {
                stage: 'Order Shipped',
                desc: 'Sent when order is dispatched with tracking details',
                icon: Truck,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                border: 'border-purple-100',
                subject: '🚚 Your order is on the way – Track Now',
              },
              {
                stage: 'Order Delivered',
                desc: 'Sent on delivery with invoice PDF attached',
                icon: Package,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                border: 'border-emerald-100',
                subject: '📦 Delivered! Invoice attached – Shipedo',
              },
            ].map((t) => (
              <div key={t.stage} className={`${t.bg} border ${t.border} rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <t.icon size={18} className={t.color} />
                  <span className={`text-sm font-bold ${t.color}`}>{t.stage}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{t.desc}</p>
                <div className="bg-white/80 rounded-lg p-2 border border-white">
                  <div className="text-xs text-gray-400 mb-1">Subject line:</div>
                  <div className="text-xs font-semibold text-[#1a1c3a]">{t.subject}</div>
                </div>
              </div>
            ))}
          </div>

          {/* COD notification */}
          <div className="mt-4 bg-[#1a1c3a] rounded-xl p-4 flex items-start gap-4">
            <div className="w-10 h-10 bg-[#f4991a]/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail size={20} className="text-[#f4991a]" />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm mb-1">COD Collection Alerts</div>
              <p className="text-white/60 text-xs">
                Sellers receive an automatic email notification when their COD cash is collected by the delivery agent, with a daily summary report for admin.
              </p>
            </div>
            <div className="text-[#f4991a] text-xs font-semibold bg-[#f4991a]/10 px-3 py-1.5 rounded-lg flex-shrink-0">
              Auto + Daily
            </div>
          </div>
        </div>

        {/* Invoices table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[#1a1c3a]">All Invoices</h2>
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search invoices..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Invoice</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Seller</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Order Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order) => {
                  const invoiceNumber = `INV-${order.trackingNumber.replace('SHP-', '')}`
                  const emailSent = sentEmails.has(order.id)

                  return (
                    <tr key={order.id} className="table-row-hover">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                            <FileText size={15} className="text-[#f4991a]" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1a1c3a] font-mono">{invoiceNumber}</div>
                            <div className="text-xs text-gray-400">{order.trackingNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-[#1a1c3a]">{order.customerName}</div>
                        <div className="text-xs text-gray-400">{order.customerCity}</div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="text-xs text-gray-500">{order.sellerName}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold text-[#f4991a]">
                          KES {(order.totalAmount + 350).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">{order.paymentMethod}</div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-orange-50 flex items-center justify-center text-gray-400 hover:text-[#f4991a] transition-all"
                            title="View invoice"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => handleSendEmail(order.id)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              emailSent
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600'
                            }`}
                            title={emailSent ? 'Email sent' : 'Send email'}
                          >
                            {emailSent ? <CheckCircle size={14} /> : <Mail size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {selectedOrder && (
        <InvoicePreview
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  )
}
