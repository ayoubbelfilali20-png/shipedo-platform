'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, BarChart3, Phone, Warehouse,
  CreditCard, FileText, Wallet, Users, Plug, Settings,
  LogOut, ChevronRight, Truck as TruckIcon, PlaneTakeoff,
  ShieldCheck, Store, Headphones, PanelLeftClose, PanelLeftOpen,
  ShoppingBag, Search, ChevronDown, Plus, List, Clock, UserCog,
  Send
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useT, type TKey } from '@/lib/i18n'

/* ─── Role config ─────────────────────────────────────── */
const roleConfig = {
  admin:  { label: 'Admin',      badge: 'bg-purple-500/20 text-purple-300', avatarBg: 'from-purple-500 to-purple-700',  name: 'Admin',  icon: ShieldCheck },
  seller: { label: 'Seller',     badge: 'bg-[#f4991a]/20 text-orange-300',  avatarBg: 'from-[#f4991a] to-orange-600',  name: 'Seller', icon: Store       },
  agent:  { label: 'Call Agent', badge: 'bg-blue-500/20 text-blue-300',     avatarBg: 'from-blue-500 to-blue-700',     name: 'Agent',  icon: Headphones  },
}

/* ─── Nav types ───────────────────────────────────────── */
interface SubItem  { href: string; labelKey: TKey; icon: React.ElementType }
interface NavItem  { href?: string; icon: React.ElementType; labelKey: TKey; sub?: SubItem[] }
interface NavSection { labelKey: TKey; items: NavItem[] }

/* ─── Admin nav ───────────────────────────────────────── */
const adminNav: NavSection[] = [
  {
    labelKey: 'nav_main',
    items: [
      { href: '/dashboard',           icon: LayoutDashboard, labelKey: 'nav_dashboard'  },
      { href: '/dashboard/analytics', icon: BarChart3,       labelKey: 'nav_analytics' },
    ],
  },
  {
    labelKey: 'nav_management',
    items: [
      { href: '/dashboard/sellers',     icon: Store,        labelKey: 'nav_sellers'     },
      { href: '/dashboard/agents',      icon: UserCog,      labelKey: 'nav_agents'      },
      { href: '/dashboard/expeditions', icon: PlaneTakeoff, labelKey: 'nav_expeditions' },
      { href: '/dashboard/billing',     icon: Send,         labelKey: 'nav_billing'     },
      { href: '/dashboard/settings',    icon: Settings,     labelKey: 'nav_settings'    },
    ],
  },
]

/* ─── Seller nav ──────────────────────────────────────── */
const sellerNav: NavSection[] = [
  {
    labelKey: 'nav_main',
    items: [
      { href: '/seller',          icon: LayoutDashboard, labelKey: 'nav_dashboard' },
      { icon: Package, labelKey: 'nav_orders', sub: [
        { href: '/seller/orders',     icon: List, labelKey: 'nav_all_orders' },
        { href: '/seller/orders/new', icon: Plus, labelKey: 'nav_new_order'  },
      ]},
      { href: '/seller/shipping',  icon: TruckIcon, labelKey: 'nav_shipping'  },
      { href: '/seller/analytics', icon: BarChart3, labelKey: 'nav_analytics' },
    ],
  },
  {
    labelKey: 'nav_stock',
    items: [
      { icon: ShoppingBag, labelKey: 'nav_products', sub: [
        { href: '/seller/products',     icon: List, labelKey: 'nav_all_products' },
        { href: '/seller/products/new', icon: Plus, labelKey: 'nav_new_product'  },
      ]},
      { icon: PlaneTakeoff, labelKey: 'nav_expeditions', sub: [
        { href: '/seller/expeditions',     icon: List, labelKey: 'nav_all_expeditions' },
        { href: '/seller/expeditions/new', icon: Plus, labelKey: 'nav_new_expedition'  },
      ]},
      { icon: Search, labelKey: 'nav_sourcings', sub: [
        { href: '/seller/sourcings',     icon: List, labelKey: 'nav_all_sourcings' },
        { href: '/seller/sourcings/new', icon: Plus, labelKey: 'nav_new_sourcing'  },
      ]},
    ],
  },
  {
    labelKey: 'nav_finance',
    items: [
      { href: '/seller/transactions', icon: Wallet,   labelKey: 'nav_my_wallet' },
      { href: '/seller/invoices',     icon: FileText, labelKey: 'nav_invoices'  },
    ],
  },
  {
    labelKey: 'nav_account',
    items: [
      { href: '/seller/integrations', icon: Plug,     labelKey: 'nav_integrations' },
      { href: '/seller/settings',     icon: Settings, labelKey: 'nav_settings'     },
    ],
  },
]

/* ─── Agent nav ───────────────────────────────────────── */
const agentNav: NavSection[] = [
  {
    labelKey: 'nav_main',
    items: [
      { href: '/agent',         icon: LayoutDashboard, labelKey: 'nav_dashboard'    },
      { href: '/agent/calls',   icon: Phone,           labelKey: 'nav_call_queue'   },
      { href: '/agent/history', icon: Clock,           labelKey: 'nav_call_history' },
    ],
  },
  {
    labelKey: 'nav_account',
    items: [
      { href: '/agent/settings', icon: Settings, labelKey: 'nav_settings' },
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
  const { t } = useT()
  const baseUser = roleConfig[role as keyof typeof roleConfig] ?? roleConfig.admin
  const [displayName, setDisplayName] = useState(baseUser.name)
  useEffect(() => {
    try {
      const key = role === 'seller' ? 'shipedo_seller' : role === 'agent' ? 'shipedo_agent' : 'shipedo_admin'
      const stored = localStorage.getItem(key)
      if (stored) {
        const u = JSON.parse(stored)
        if (u.name) setDisplayName(u.name)
      }
    } catch {}
  }, [])
  const user = { ...baseUser, name: displayName }
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
          initial[item.labelKey] = true
        }
      })
    )
    return initial
  })

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))

  return (
    <aside
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className={cn(
        'fixed left-0 top-0 h-full bg-[#1a1c3a] flex flex-col transition-all duration-300 z-40 select-none',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-center px-4 border-b border-white/10 h-[65px]">
        <div className="relative group">
          <Link href={role === 'seller' ? '/seller' : role === 'agent' ? '/agent' : '/dashboard'} className="flex items-center justify-center">
            {collapsed ? (
              <img src="/logo2.png" alt="Shipedo" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <img src="/logo.png" alt="Shipedo" className="h-28 w-auto object-contain max-w-[210px]" />
            )}
          </Link>
          {collapsed && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#f4991a] text-white text-xs font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Dashboard
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1">
        {navSections.map(section => (
          <div key={section.labelKey} className="mb-4">
            {!collapsed && (
              <div className="text-white/25 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5">{t(section.labelKey)}</div>
            )}
            {collapsed && <div className="my-2 border-t border-white/10" />}

            <div className="space-y-0.5">
              {section.items.map(item => {
                const itemLabel = t(item.labelKey)
                if (!item.sub) {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href!}
                      title={collapsed ? itemLabel : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                        collapsed && 'justify-center px-2',
                        isActive ? 'bg-[#f4991a]/15 text-[#f4991a]' : 'text-white/55 hover:text-[#f4991a] hover:bg-[#f4991a]/10'
                      )}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{itemLabel}</span>
                          {isActive && <ChevronRight size={13} className="opacity-50" />}
                        </>
                      )}
                      {collapsed && (
                        <span className="absolute left-full ml-3 bg-[#1a1c3a] border border-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                          {itemLabel}
                        </span>
                      )}
                    </Link>
                  )
                }

                const isGroupActive = item.sub.some(s => pathname.startsWith(s.href.replace('/new', '')))
                const isOpen = openGroups[item.labelKey] ?? false

                if (collapsed) {
                  return (
                    <Link
                      key={item.labelKey}
                      href={item.sub[0].href}
                      title={itemLabel}
                      className={cn(
                        'flex items-center justify-center px-2 py-2.5 rounded-xl transition-all group relative',
                        isGroupActive ? 'bg-[#f4991a]/15 text-[#f4991a]' : 'text-white/55 hover:text-[#f4991a] hover:bg-[#f4991a]/10'
                      )}
                    >
                      <item.icon size={18} />
                      <span className="absolute left-full ml-3 bg-[#1a1c3a] border border-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                        {itemLabel}
                      </span>
                    </Link>
                  )
                }

                return (
                  <div key={item.labelKey}>
                    <button
                      onClick={() => toggleGroup(item.labelKey)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                        isGroupActive ? 'text-[#f4991a]' : 'text-white/55 hover:text-[#f4991a] hover:bg-[#f4991a]/10'
                      )}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{itemLabel}</span>
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
                                isSubActive ? 'bg-[#f4991a]/15 text-[#f4991a]' : 'text-white/40 hover:text-[#f4991a] hover:bg-[#f4991a]/10'
                              )}
                            >
                              <s.icon size={13} className="flex-shrink-0" />
                              {t(s.labelKey)}
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
