'use client'

import { Bell, Menu, ShieldCheck, Store, Headphones, ChevronDown, LogOut, Wallet, TrendingUp, EyeOff, Eye, DollarSign, CheckCircle, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtUsd, fmtKes, toKes } from '@/lib/currency'
import { useT, languages, type Lang } from '@/lib/i18n'

const roleConfig = {
  admin:  { label: 'Admin',      badge: 'bg-purple-100 text-purple-700', avatar: 'from-purple-500 to-purple-700', name: 'Admin', icon: ShieldCheck },
  seller: { label: 'Seller',     badge: 'bg-orange-100 text-orange-700', avatar: 'from-[#f4991a] to-orange-600', name: 'Seller', icon: Store       },
  agent:  { label: 'Call Agent', badge: 'bg-blue-100 text-blue-700',     avatar: 'from-blue-500 to-blue-700',    name: 'Agent', icon: Headphones  },
}

const USD_RATE = 130

interface HeaderProps {
  title: string
  subtitle?: string
  action?: { label: string; href?: string; onClick?: () => void }
  onMenuToggle?: () => void
  role?: string
}


/* ── Header ─────────────────────────────────────── */

export default function Header({ title, subtitle, action, onMenuToggle, role: roleProp }: HeaderProps) {
  const pathname = usePathname()
  const role = roleProp ?? (pathname.startsWith('/seller') ? 'seller' : pathname.startsWith('/agent') ? 'agent' : 'admin')
  const [dropOpen, setDropOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [hideBalance, setHideBalance] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { lang, setLang, t } = useT()
  const walletRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
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
  const UserIcon = user.icon
  const [walletData, setWalletData] = useState({ balance: 0, transferred: 0 })
  useEffect(() => {
    if (role !== 'seller') return
    let sellerId: string | null = null
    try {
      const stored = localStorage.getItem('shipedo_seller')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.role === 'seller') sellerId = String(u.id)
      }
    } catch {}
    if (!sellerId) return
    ;(async () => {
      const [{ data: wd }, { data: tx }] = await Promise.all([
        supabase.from('seller_wallets').select('balance_usd').eq('seller_id', sellerId).maybeSingle(),
        supabase.from('wallet_transactions').select('amount_usd').eq('seller_id', sellerId).eq('type', 'withdraw'),
      ])
      const transferred = (tx ?? []).reduce((s, r: any) => s + Math.abs(Number(r.amount_usd || 0)), 0)
      setWalletData({ balance: Number(wd?.balance_usd || 0), transferred })
    })()
  }, [role])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) setWalletOpen(false)
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const changeLang = (l: Lang) => {
    setLang(l)
    setLangOpen(false)
  }

  const maskUsd = (v: number) => hideBalance ? '••••••' : fmtUsd(v)
  const maskKes = (v: number) => hideBalance ? '••••••' : fmtKes(toKes(v))

  if (role === 'seller') {
    const availableUsd = walletData.balance.toFixed(2)
    return (
      <>
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={onMenuToggle} className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <Menu size={22} />
          </button>


          <div className="flex items-center gap-2 ml-auto">
            {/* Language selector */}
            <div className="relative hidden md:block" ref={langRef}>
              <button
                onClick={() => setLangOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              >
                <span className="text-base leading-none">{languages[lang].flag}</span>
                <span className="text-xs font-semibold text-[#1a1c3a]">{languages[lang].label}</span>
                <ChevronDown size={12} className="text-gray-400" />
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden p-1.5">
                  {(Object.keys(languages) as Lang[]).map(code => (
                    <button
                      key={code}
                      onClick={() => changeLang(code)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-all ${
                        lang === code
                          ? 'bg-orange-50 text-[#f4991a] font-bold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base leading-none">{languages[code].flag}</span>
                      <span>{languages[code].label}</span>
                      {lang === code && <CheckCircle size={13} className="ml-auto text-[#f4991a]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Country selector — Kenya */}
            <button className="hidden md:flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
              <span className="text-base leading-none">🇰🇪</span>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[11px] font-bold text-[#1a1c3a]">Kenya</span>
                <span className="text-[9px] font-semibold text-gray-400 mt-0.5">KES</span>
              </div>
              <ChevronDown size={12} className="text-gray-400" />
            </button>

            {/* Balance with eye toggle */}
            <div className="relative" ref={walletRef}>
              <button
                onClick={() => setWalletOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 bg-[#1a1c3a] hover:bg-[#252750] text-white rounded-xl text-xs font-bold transition-all"
              >
                <Wallet size={13} className="text-[#f4991a]" />
                <span className="hidden sm:inline">
                  {hideBalance ? '••••' : `$${availableUsd}`}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setHideBalance(h => !h) }}
                  className="ml-0.5 w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                >
                  {hideBalance ? <EyeOff size={10} /> : <Eye size={10} />}
                </span>
              </button>

              {walletOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#1a1c3a] rounded-2xl shadow-2xl border border-white/10 p-4 z-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">{t('hdr_my_wallet')}</span>
                    <button
                      onClick={() => setHideBalance(h => !h)}
                      className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white transition-all"
                    >
                      {hideBalance ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                          <Wallet size={13} className="text-green-400" />
                        </div>
                        <span className="text-white/60 text-xs">Balance</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[#f4991a] font-bold text-sm">{maskUsd(walletData.balance)}</div>
                        <div className="text-white/30 text-[10px]">{maskKes(walletData.balance)}</div>
                      </div>
                    </div>
                    <div className="w-full h-px bg-white/10" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                          <TrendingUp size={13} className="text-blue-400" />
                        </div>
                        <span className="text-white/60 text-xs">Transferred</span>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-300 font-bold text-sm">{maskUsd(walletData.transferred)}</div>
                        <div className="text-white/30 text-[10px]">{maskKes(walletData.transferred)}</div>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/seller/wallet"
                    onClick={() => setWalletOpen(false)}
                    className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    <DollarSign size={13} /> Open wallet
                  </Link>
                </div>
              )}
            </div>

            {/* Bell */}
            <button className="relative w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all">
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#f4991a] rounded-full" />
            </button>

            {/* Hexagon user avatar */}
            <div className="relative">
              <button
                onClick={() => setDropOpen(!dropOpen)}
                className="flex items-center gap-3 pl-1.5 pr-3 py-1.5 hover:bg-gray-50 rounded-xl transition-all"
              >
                <div
                  className={`w-10 h-10 bg-gradient-to-br ${user.avatar} flex items-center justify-center text-white text-base font-bold flex-shrink-0`}
                  style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                >
                  {user.name[0]}
                </div>
                <div className="hidden lg:flex flex-col items-start leading-tight">
                  <span className="text-sm font-bold text-[#1a1c3a] max-w-[160px] truncate">{user.name}</span>
                  <span className="text-[11px] font-semibold text-gray-400 mt-0.5">{t('hdr_seller')}</span>
                </div>
                <ChevronDown size={14} className="text-gray-400 hidden lg:block" />
              </button>

              {dropOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-1 ${user.badge}`}>
                        <UserIcon size={11} />
                        {user.label}
                      </div>
                      <div className="text-sm font-bold text-[#1a1c3a]">{user.name}</div>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/seller/profile"
                        onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                      >
                        <User size={14} /> {t('hdr_profile')}
                      </Link>
                      <button
                        onClick={() => { try { localStorage.removeItem('shipedo_seller'); localStorage.removeItem('shipedo_user') } catch {}; window.location.href = '/login' }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <LogOut size={14} /> {t('hdr_signout')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

      </>
    )
  }

  return (
    <>
      <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={onMenuToggle} className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors">
          <Menu size={22} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[#1a1c3a] leading-tight">{title}</h1>
          {subtitle && <p className="text-gray-400 text-xs mt-0.5 truncate">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {/* Bell */}
          <button className="relative w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#f4991a] rounded-full" />
          </button>

          {/* User chip */}
          <div className="relative">
            <button
              onClick={() => setDropOpen(!dropOpen)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all"
            >
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${user.avatar} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                {user.name[0]}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none">
                <span className="text-xs font-bold text-[#1a1c3a]">{user.name}</span>
                <span className={`text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded-full ${user.badge}`}>
                  {user.label}
                </span>
              </div>
              <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
            </button>

            {dropOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-1 ${user.badge}`}>
                      <UserIcon size={11} />
                      {user.label}
                    </div>
                    <div className="text-sm font-bold text-[#1a1c3a]">{user.name}</div>
                  </div>
                  <div className="p-2">
                    <Link
                      href={role === 'seller' ? '/seller/profile' : role === 'agent' ? '/agent/profile' : '/dashboard/profile'}
                      onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                    >
                      <User size={14} /> Profile
                    </Link>
                    <button
                      onClick={() => {
                        try {
                          const key = role === 'seller' ? 'shipedo_seller' : role === 'agent' ? 'shipedo_agent' : 'shipedo_admin'
                          localStorage.removeItem(key)
                          localStorage.removeItem('shipedo_user')
                        } catch {}
                        window.location.href = '/login'
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

    </>
  )
}
