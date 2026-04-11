'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { incrementStockForOrderItems } from '@/lib/stock'
import {
  Search, RotateCcw, Package, CheckCircle, X, AlertCircle,
  CheckSquare, Square, Printer,
} from 'lucide-react'

type OrderRow = {
  id: string
  tracking_number: string
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  items: any[]
  total_amount: number
  status: string
  payment_method: string
  returned_at?: string | null
  created_at: string
  seller_id?: string | null
}

export default function ReturnsPage() {
  const [search, setSearch] = useState('')
  const [foundOrder, setFoundOrder] = useState<OrderRow | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState('')

  // Return history
  const [returnedOrders, setReturnedOrders] = useState<OrderRow[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Return queue — blue sidebar
  const [returnQueue, setReturnQueue] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .eq('status', 'returned')
      .order('returned_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setReturnedOrders((data || []) as OrderRow[])
        setLoadingHistory(false)
      })
  }, [])

  const searchOrder = async () => {
    const q = search.trim()
    if (!q) return
    setSearching(true)
    setError('')
    setFoundOrder(null)
    setSuccess('')

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('tracking_number', q)
      .limit(1)

    const order = (data?.[0] as OrderRow) || null

    if (!order) {
      setError('Order not found. Check the tracking number.')
    } else if (order.status === 'returned') {
      setError(`Order ${order.tracking_number} is already returned.`)
    } else if (!['shipped', 'delivered', 'confirmed', 'prepared'].includes(order.status)) {
      setError(`Order ${order.tracking_number} has status "${order.status}" — cannot return.`)
    } else {
      setFoundOrder(order)
    }
    setSearching(false)
  }

  const processReturn = async (order: OrderRow) => {
    setProcessing(true)
    setError('')
    setSuccess('')

    // 1. Mark order as returned
    await supabase.from('orders').update({
      status: 'returned',
      returned_at: new Date().toISOString(),
    }).eq('id', order.id)

    // 2. Restore stock
    await incrementStockForOrderItems(order.items)

    // 3. Update local state
    const updated = { ...order, status: 'returned', returned_at: new Date().toISOString() }
    setReturnedOrders(prev => [updated, ...prev])
    setFoundOrder(null)
    setSearch('')
    setSuccess(`Order ${order.tracking_number} returned successfully. Stock restored.`)
    setProcessing(false)
  }

  const processBatchReturn = async () => {
    if (returnQueue.size === 0) return
    setProcessing(true)
    setError('')
    setSuccess('')

    // Fetch all orders in queue
    const { data } = await supabase
      .from('orders')
      .select('*')
      .in('id', Array.from(returnQueue))

    const orders = (data || []) as OrderRow[]
    let count = 0

    for (const order of orders) {
      if (order.status === 'returned') continue
      await supabase.from('orders').update({
        status: 'returned',
        returned_at: new Date().toISOString(),
      }).eq('id', order.id)
      await incrementStockForOrderItems(order.items)
      count++
    }

    // Update history
    const updated = orders
      .filter(o => o.status !== 'returned')
      .map(o => ({ ...o, status: 'returned', returned_at: new Date().toISOString() }))
    setReturnedOrders(prev => [...updated, ...prev])
    setReturnQueue(new Set())
    setSuccess(`${count} order(s) returned successfully. Stock restored.`)
    setProcessing(false)
  }

  // Add to return queue from found order
  const addToQueue = (order: OrderRow) => {
    setReturnQueue(prev => new Set(prev).add(order.id))
    // Keep order info for display
    setReturnedOrders(prev => {
      // Temporarily store in a separate place — use foundOrder list
      return prev
    })
    setFoundOrder(null)
    setSearch('')
  }

  // Queue display orders — need to fetch them
  const [queueOrders, setQueueOrders] = useState<OrderRow[]>([])

  // When queue changes, fetch order details
  useEffect(() => {
    if (returnQueue.size === 0) { setQueueOrders([]); return }
    supabase
      .from('orders')
      .select('*')
      .in('id', Array.from(returnQueue))
      .then(({ data }) => setQueueOrders((data || []) as OrderRow[]))
  }, [returnQueue.size])

  const removeFromQueue = (id: string) => {
    setReturnQueue(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  return (
    <div className="min-h-screen">
      <Header title="Returns" subtitle="Manage returned orders" />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area */}
        <div className="lg:col-span-2 space-y-5">
          {/* Search box */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-[#1a1c3a] text-base mb-4 flex items-center gap-2">
              <RotateCcw size={16} /> Process Return
            </h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchOrder()}
                  placeholder="Enter tracking number..."
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                />
              </div>
              <button
                onClick={searchOrder}
                disabled={searching || !search.trim()}
                className="px-5 py-3 bg-[#1a1c3a] hover:bg-[#2a2c4a] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {success && (
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <CheckCircle size={14} /> {success}
              </div>
            )}

            {/* Found order */}
            {foundOrder && (
              <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-[#1a1c3a] font-mono">{foundOrder.tracking_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Status: <span className="font-semibold">{foundOrder.status}</span></p>
                  </div>
                  <button onClick={() => setFoundOrder(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Customer</p>
                    <p className="text-sm font-semibold text-[#1a1c3a]">{foundOrder.customer_name}</p>
                    <p className="text-xs text-gray-500">{foundOrder.customer_phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">City</p>
                    <p className="text-sm font-semibold text-[#1a1c3a]">{foundOrder.customer_city}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Items ({(foundOrder.items || []).length})</p>
                  <div className="space-y-1">
                    {(Array.isArray(foundOrder.items) ? foundOrder.items : []).map((it: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg p-2 border border-gray-100">
                        <span className="font-semibold text-[#1a1c3a]">{it.name || 'Item'}</span>
                        <span className="text-gray-500">x{it.quantity || 1} &middot; KES {((Number(it.unit_price) || Number(it.price) || 0) * (Number(it.quantity) || 1)).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-sm font-bold text-gray-600">Total: <span className="text-[#f4991a]">KES {(foundOrder.total_amount || 0).toLocaleString()}</span></span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToQueue(foundOrder)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      Add to queue
                    </button>
                    <button
                      onClick={() => processReturn(foundOrder)}
                      disabled={processing}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : 'Return now'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Return history */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-[#1a1c3a] text-base">Return History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Tracking</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Customer</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">City</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Items</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Returned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingHistory ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Loading...</td></tr>
                  ) : returnedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        <RotateCcw size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No returned orders yet</p>
                      </td>
                    </tr>
                  ) : returnedOrders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3">
                        <span className="text-xs font-mono font-semibold text-[#1a1c3a]">{o.tracking_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-[#1a1c3a]">{o.customer_name}</p>
                        <p className="text-[10px] text-gray-400">{o.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-600">{o.customer_city}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{(o.items || []).length} item(s)</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-[#1a1c3a]">KES {(o.total_amount || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-400">{o.returned_at ? new Date(o.returned_at).toLocaleDateString() : '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar — Return Queue */}
        <div>
          <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-5 sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                <RotateCcw size={14} /> Return Queue ({queueOrders.length})
              </h3>
            </div>

            {queueOrders.length === 0 ? (
              <p className="text-xs text-blue-400 text-center py-6">Search orders by tracking number and add them to the return queue.</p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {queueOrders.map(o => (
                  <div key={o.id} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-blue-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1a1c3a] truncate">{o.customer_name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{o.tracking_number}</p>
                      <p className="text-[10px] text-gray-400">{o.customer_city} &middot; {(o.items || []).length} item(s)</p>
                    </div>
                    <button onClick={() => removeFromQueue(o.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {queueOrders.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={processBatchReturn}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  <RotateCcw size={12} /> {processing ? 'Processing...' : `Return all (${queueOrders.length})`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
