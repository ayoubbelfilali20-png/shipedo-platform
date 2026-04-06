'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import { mockSourcings } from '@/lib/data'
import { SourcingStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import {
  Search, Plus, Package, X,
  Clock, Microscope, FileText, CheckCircle,
  XCircle, ShoppingCart, Globe
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const statusConfig: Record<SourcingStatus, { label: string; color: string; bg: string; border: string; dot: string; icon: React.ElementType }> = {
  pending:     { label: 'Pending',     color: 'text-gray-600',    bg: 'bg-gray-50',    border: 'border-gray-200',    dot: 'bg-gray-400',    icon: Clock        },
  researching: { label: 'Researching', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500',    icon: Microscope   },
  quoted:      { label: 'Quoted',      color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200',  dot: 'bg-purple-500',  icon: FileText     },
  approved:    { label: 'Approved',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle  },
  rejected:    { label: 'Rejected',    color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500',     icon: XCircle      },
  ordered:     { label: 'Ordered',     color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  dot: 'bg-[#f4991a]',   icon: ShoppingCart },
}

const originFlag: Record<string, string> = {
  China: '🇨🇳', Dubai: '🇦🇪', Turkey: '🇹🇷', India: '🇮🇳', Local: '🇰🇪',
}

const statusFilters: { value: SourcingStatus | 'all'; label: string }[] = [
  { value: 'all',         label: 'All'         },
  { value: 'pending',     label: 'Pending'     },
  { value: 'researching', label: 'Researching' },
  { value: 'quoted',      label: 'Quoted'      },
  { value: 'approved',    label: 'Approved'    },
  { value: 'ordered',     label: 'Ordered'     },
]

function StatusBadge({ status }: { status: SourcingStatus }) {
  const s = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', s.color, s.bg, s.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}

export default function SourcingsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SourcingStatus | 'all'>('all')

  const filtered = mockSourcings.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = s.productName.toLowerCase().includes(q) || s.reference.toLowerCase().includes(q) || (s.supplierName ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total:       mockSourcings.length,
    active:      mockSourcings.filter(s => ['pending','researching','quoted'].includes(s.status)).length,
    approved:    mockSourcings.filter(s => s.status === 'approved').length,
    ordered:     mockSourcings.filter(s => s.status === 'ordered').length,
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Sourcings"
        subtitle={`${stats.total} sourcing requests`}
        action={{ label: 'New Sourcing', href: '/dashboard/sourcings/new' }}
      />

      <div className="px-6 pt-5 pb-6 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: stats.total,    icon: Globe,         color: 'text-[#1a1c3a]',   bg: 'bg-[#1a1c3a]/8'   },
            { label: 'Active',   value: stats.active,   icon: Microscope,    color: 'text-blue-600',    bg: 'bg-blue-50'       },
            { label: 'Approved', value: stats.approved, icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50'    },
            { label: 'Ordered',  value: stats.ordered,  icon: ShoppingCart,  color: 'text-orange-500',  bg: 'bg-orange-50'     },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1a1c3a]">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sourcings..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] shadow-sm transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === f.value
                    ? 'bg-[#1a1c3a] text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Link
            href="/dashboard/sourcings/new"
            className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex-shrink-0"
          >
            <Plus size={13} />
            New Sourcing
          </Link>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center text-gray-400">
              <Search size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No sourcing requests found</p>
            </div>
          ) : (
            filtered.map(src => {
              const s = statusConfig[src.status]
              const Icon = s.icon
              return (
                <div
                  key={src.id}
                  onClick={() => router.push(`/dashboard/sourcings/${src.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                      <Icon size={20} className={s.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-[#1a1c3a] text-sm">{src.productName}</h3>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{src.reference}</p>
                        </div>
                        <StatusBadge status={src.status} />
                      </div>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-1">{src.description}</p>

                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="text-sm">{originFlag[src.origin]}</span>
                          {src.origin}
                        </span>
                        <span className="text-xs text-gray-500">
                          Qty: <span className="font-semibold text-[#1a1c3a]">{src.quantity.toLocaleString()}</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          Target: <span className="font-semibold text-[#1a1c3a]">KES {src.targetPrice.toLocaleString()}</span>
                        </span>
                        {src.quotedPrice && (
                          <span className="text-xs">
                            Quoted: <span className={cn('font-semibold', src.quotedPrice <= src.targetPrice ? 'text-emerald-600' : 'text-red-500')}>
                              KES {src.quotedPrice.toLocaleString()}
                            </span>
                          </span>
                        )}
                        {src.supplierName && (
                          <span className="text-xs text-gray-500">
                            Supplier: <span className="font-medium text-[#1a1c3a]">{src.supplierName}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
