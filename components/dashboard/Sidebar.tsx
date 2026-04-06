'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, BarChart3, Phone, Warehouse,
  CreditCard, FileText, Wallet, Users, Plug, Settings,
  LogOut, ChevronRight, Truck as TruckIcon, PlaneTakeoff,
  ShieldCheck, Store, Headphones, PanelLeftClose, PanelLeftOpen,
  ShoppingBag, Search, ChevronDown, Plus, List, Clock, UserCog
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

/* ─── Role config ─────────────────────────────────────── */
const roleConfig = {
  admin:  { label: 'Admin',      badge: 'bg-purple-500/20 text-purple-300', avatarBg: 'from-purple-500 to-purple-700',  name: 'Admin User',    icon: ShieldCheck },
  seller: { label: 'Seller',     badge: 'bg-[#f4991a]/20 text-orange-300',  avatarBg: 'from-[#f4991a] to-orange-600',  name: 'TechHub Kenya', icon: Store       },
  agent:  { label: 'Call Agent', badge: 'bg-blue-500/20 text-blue-300',     avatarBg: 'from-blue-500 to-blue-700',     name: 'Yassine B.',    icon: Headphones  },
}

/* ─── Nav types ───────────────────────────────────────── */
interface SubItem  { href: string; label: string; icon: React.ElementType }
interface NavItem  { href?: string; icon: React.ElementType; label: string; sub?: SubItem[] }
interface NavSection { label: string; items: NavItem[] }

/* ─── Admin nav ───────────────────────────────────────── */
const adminNav: NavSection[] = [
  {
    label: 'MAIN',
    items: [
      { href: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard'  },
      { icon: Package, label: 'Orders', sub: [
        { href: '/dashboard/orders',     icon: List, label: 'All Orders' },
        { href: '/dashboard/orders/new', icon: Plus, label: 'New Order'  },
      ]},
      { href: '/dashboard/shipping',  icon: TruckIcon,  label: 'Shipping'  },
      { href: '/dashboard/analytics', icon: BarChart3,  label: 'Analytics' },
    ],
  },
  {
    label: 'STOCK',
    items: [
      { icon: ShoppingBag, label: 'Products', sub: [
        { href: '/dashboard/products',     icon: List, label: 'All Products' },
        { href: '/dashboard/products/new', icon: Plus, label: 'New Product'  },
      ]},
      { icon: PlaneTakeoff, label: 'Expeditions', sub: [
        { href: '/dashboard/expeditions',     icon: List, label: 'All Expeditions' },
        { href: '/dashboard/expeditions/new', icon: Plus, label: 'New Expedition'  },
      ]},
      { icon: Search, label: 'Sourcings', sub: [
        { href: '/dashboard/sourcings',     icon: List, label: 'All Sourcings' },
        { href: '/dashboard/sourcings/new', icon: Plus, label: 'New Sourcing'  },
      ]},
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { href: '/dashboard/call-center',  icon: Phone,      label: 'Call Center'  },
      { href: '/dashboard/fulfillment',  icon: Warehouse,  label: 'Fulfillment'  },
      { href: '/dashboard/cod',          icon: CreditCard, label: 'COD Tracking' },
      { href: '/dashboard/invoices',     icon: FileText,   label: 'Invoices'     },
      { href: '/dashboard/transactions', icon: Wallet,     label: 'Transactions' },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { href: '/dashboard/customers',    icon: Users,       label: 'Customers'    },
      { href: '/dashboard/sellers',      icon: Store,       label: 'Sellers'      },
      { href: '/dashboard/agents',       icon: UserCog,     label: 'Agents'       },
      { href: '/dashboard/settings',     icon: Settings,    label: 'Settings'     },
    ],
  },
]

/* ─── Seller nav ──────────────────────────────────────── */
const sellerNav: NavSection[] = [
  {
    label: 'MAIN',
    items: [
      { href: '/seller',          icon: LayoutDashboard, label: 'Dashboard' },
      { icon: Package, label: 'Orders', sub: [
        { href: '/seller/orders',     icon: List, label: 'All Orders' },
        { href: '/seller/orders/new', icon: Plus, label: 'New Order'  },
      ]},
      { href: '/seller/shipping',  icon: TruckIcon, label: 'Shipping'  },
      { href: '/seller/analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  {
    label: 'STOCK',
    items: [
      { icon: ShoppingBag, label: 'Products', sub: [
        { href: '/seller/products',     icon: List, label: 'All Products' },
        { href: '/seller/products/new', icon: Plus, label: 'New Product'  },
      ]},
      { icon: PlaneTakeoff, label: 'Expeditions', sub: [
        { href: '/seller/expeditions',     icon: List, label: 'All Expeditions' },
        { href: '/seller/expeditions/new', icon: Plus, label: 'New Expedition'  },
      ]},
      { icon: Search, label: 'Sourcings', sub: [
        { href: '/seller/sourcings',     icon: List, label: 'All Sourcings' },
        { href: '/seller/sourcings/new', icon: Plus, label: 'New Sourcing'  },
      ]},
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { href: '/seller/transactions', icon: Wallet,   label: 'My Wallet' },
      { href: '/seller/invoices',     icon: FileText, label: 'Invoices'  },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { href: '/seller/integrations', icon: Plug,     label: 'Integrations' },
      { href: '/seller/settings',     icon: Settings, label: 'Settings'     },
    ],
  },
]

/* ─── Agent nav ───────────────────────────────────────── */
const agentNav: NavSection[] = [
  {
    label: 'MAIN',
    items: [
      { href: '/agent',         icon: LayoutDashboard, label: 'Dashboard'    },
      { href: '/agent/calls',   icon: Phone,           label: 'Call Queue'   },
      { href: '/agent/history', icon: Clock,           label: 'Call History' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { href: '/agent/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

function getNav(role: string): NavSection[] {
  if (role === 'seller') return sellerNav
  if (role === 'agent')  return agentNav
  return adminNav
}

function getLogoutHref(role: string) {
  return '/login'
}

/* ─── Props ───────────────────────────────────────────── */
interface SidebarProps {
  role?: string
  collapsed?: boolean
  onCollapsedChange?: (v: boolean) => void
}

/* ─── Component ───────────────────────────────────────── */
export default function Sidebar({ role = 'admin', collapsed: collapsedProp, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname()
  const user = roleConfig[role as keyof typeof roleConfig] ?? roleConfig.admin
  const [collapsedInternal, setCollapsedInternal] = useState(false)

  const collapsed = collapsedProp !== undefined ? collapsedProp : collapsedInternal
  const setCollapsed = (v: boolean) => {
    setCollapsedInternal(v)
    onCollapsedChange?.(v)
  }

  const navSections = getNav(role)

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navSections.forEach(section =>
      section.items.forEach(item => {
        if (item.sub?.some(s => pathname.startsWith(s.href.replace('/new', '')))) {
          initial[item.label] = true
        }
      })
    )
    return initial
  })

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full bg-[#1a1c3a] flex flex-col transition-all duration-300 z-40 select-none',
      collapsed ? 'w-[68px]' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 min-h-[60px]">
        <Link href={role === 'seller' ? '/seller' : role === 'agent' ? '/agent' : '/dashboard'} className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-[#f4991a] rounded-lg flex items-center justify-center flex-shrink-0">
            <TruckIcon size={16} className="text-white" />
          </div>
          {!collapsed && <span className="text-white font-bold text-lg tracking-tight whitespace-nowrap overflow-hidden">Shipedo</span>}
        </Link>
        <button onClick={() => setCollapsed(!collapsed)} className="text-white/30 hover:text-white transition-colors flex-shrink-0 ml-1">
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1">
        {navSections.map(section => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <div className="text-white/25 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5">{section.label}</div>
            )}
            {collapsed && <div className="my-2 border-t border-white/10" />}

            <div className="space-y-0.5">
              {section.items.map(item => {
                if (!item.sub) {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href!}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                        collapsed && 'justify-center px-2',
                        isActive ? 'bg-[#f4991a]/15 text-[#f4991a]' : 'text-white/55 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {isActive && <ChevronRight size={13} className="opacity-50" />}
                        </>
                      )}
                      {collapsed && (
                        <span className="absolute left-full ml-3 bg-[#1a1c3a] border border-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  )
                }

                const isGroupActive = item.sub.some(s => pathname.startsWith(s.href.replace('/new', '')))
                const isOpen = openGroups[item.label] ?? false

                if (collapsed) {
                  return (
                    <Link
                      key={item.label}
                      href={item.sub[0].href}
                      title={item.label}
                      className={cn(
                        'flex items-center justify-center px-2 py-2.5 rounded-xl transition-all group relative',
                        isGroupActive ? 'bg-[#f4991a]/15 text-[#f4991a]' : 'text-white/55 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <item.icon size={18} />
                      <span className="absolute left-full ml-3 bg-[#1a1c3a] border border-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                        {item.label}
                      </span>
                    </Link>
                  )
                }

                return (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleGroup(item.label)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                        isGroupActive ? 'text-[#f4991a]' : 'text-white/55 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      <ChevronDown size={13} className={cn('opacity-50 transition-transform duration-200', isOpen && 'rotate-180')} />
                    </button>
                    {isOpen && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                        {item.sub.map(s => {
                          const isSubActive = pathname === s.href || pathname.startsWith(s.href + '/')
                          return (
                            <Link
                              key={s.href}
                              href={s.href}
                              className={cn(
                                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all',
                                isSubActive ? 'bg-[#f4991a]/15 text-[#f4991a]' : 'text-white/40 hover:text-white hover:bg-white/5'
                              )}
                            >
                              <s.icon size={13} className="flex-shrink-0" />
                              {s.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

    </aside>
  )
}
