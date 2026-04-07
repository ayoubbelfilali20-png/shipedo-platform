'use client'

import { Bell, Search, Menu, ShieldCheck, Store, Headphones, ChevronDown, LogOut, Wallet, TrendingUp, Lock, Clock, EyeOff, Eye, DollarSign, AlertTriangle, CheckCircle, X, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { mockSellerWallet } from '@/lib/data'
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

/* ── Withdraw Modal ─────────────────────────────── */
function WithdrawModal({ onClose }: { onClose: () => void }) {
  const w = mockSellerWallet
  const availableUsd = w.availableBalance / USD_RATE

  const [amountUsd, setAmountUsd] = useState('')
  const [paypal, setPaypal] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const usdNum = parseFloat(amountUsd) || 0
  const fee = usdNum > 0 ? Math.max(0.5, usdNum * 0.02) : 0
  const youGet = Math.max(0, usdNum - fee)
  const quickUsd = [10, 25, 50, 100]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1200))
    setSubmitting(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-[#1a1c3a]">Withdraw Funds</h2>
            <p className="text-xs text-gray-400 mt-0.5">Processed in USD via PayPal</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          {done ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={40} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-[#1a1c3a] mb-2">Withdrawal Requested!</h3>
              <p className="text-gray-400 text-sm mb-1">${youGet.toFixed(2)} USD → {paypal}</p>
              <p className="text-gray-300 text-xs mb-6">You'll receive it within 24–48 hours</p>
              <button
                onClick={() => { setDone(false); setAmountUsd(''); setPaypal(''); setName('') }}
                className="text-[#f4991a] text-sm font-semibold hover:underline"
              >
                Make another withdrawal
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Wallet summary strip */}
              <div className="bg-[#1a1c3a] rounded-2xl p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wide mb-0.5">Available (KES)</p>
                    <p className="text-white font-bold">KES {w.availableBalance.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wide mb-0.5">Available (USD)</p>
                    <p className="text-[#f4991a] font-bold">${availableUsd.toFixed(2)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'On Hold', value: `KES ${w.onHoldBalance.toLocaleString()}`, color: 'text-yellow-400' },
                    { label: 'Pending', value: `KES ${w.pendingBalance.toLocaleString()}`, color: 'text-blue-400' },
                    { label: 'Rate', value: `1 USD = ${USD_RATE} KES`, color: 'text-white/50' },
                  ].map(b => (
                    <div key={b.label} className="bg-white/5 border border-white/10 rounded-xl p-2">
                      <p className="text-white/30 text-[10px] mb-0.5">{b.label}</p>
                      <p className={`text-xs font-bold ${b.color}`}>{b.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rate note */}
              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <DollarSign size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">Withdrawals are processed in <strong>USD via PayPal</strong>. Rate: <strong>1 USD = {USD_RATE} KES</strong></p>
              </div>

              {/* USD amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    value={amountUsd}
                    onChange={e => setAmountUsd(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    max={availableUsd}
                    min={5}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] text-[#1a1c3a]"
                    required
                  />
                </div>
                {usdNum > 0 && (
                  <p className="text-xs text-gray-400 mt-1">≈ KES {(usdNum * USD_RATE).toLocaleString()}</p>
                )}
                <div className="flex gap-2 mt-2">
                  {quickUsd.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAmountUsd(q.toString())}
                      className="flex-1 text-xs font-semibold py-1.5 bg-gray-50 hover:bg-orange-50 hover:text-[#f4991a] text-gray-500 rounded-lg transition-all border border-gray-100 hover:border-orange-200"
                    >
                      ${q}
                    </button>
                  ))}
                </div>
              </div>

              {/* PayPal email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">PayPal Email</label>
                <input
                  type="email"
                  value={paypal}
                  onChange={e => setPaypal(e.target.value)}
                  placeholder="your@paypal.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                  required
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Account Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name on PayPal"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                  required
                />
              </div>

              {/* Fee breakdown */}
              {usdNum > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Withdrawal Amount</span>
                    <span className="font-medium text-[#1a1c3a]">${usdNum.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Fee (2%, min $0.50)</span>
                    <span className="font-medium text-[#1a1c3a]">− ${fee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-orange-200 pt-2 flex justify-between">
                    <span className="text-sm font-bold text-[#1a1c3a]">You Receive</span>
                    <span className="text-sm font-bold text-emerald-600">${youGet.toFixed(2)} USD</span>
                  </div>
                </div>
              )}

              {usdNum > availableUsd && usdNum > 0 && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle size={12} /> Exceeds available balance (${availableUsd.toFixed(2)})
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !amountUsd || !paypal || !name || usdNum > availableUsd || usdNum < 5}
                className="w-full py-3.5 bg-[#f4991a] hover:bg-[#f8b44a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><DollarSign size={16} /> Withdraw in USD</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Header ─────────────────────────────────────── */

export default function Header({ title, subtitle, action, onMenuToggle, role: roleProp }: HeaderProps) {
  const pathname = usePathname()
  const role = roleProp ?? (pathname.startsWith('/seller') ? 'seller' : pathname.startsWith('/agent') ? 'agent' : 'admin')
  const [dropOpen, setDropOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [hideBalance, setHideBalance] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { lang, setLang, t } = useT()
  const walletRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const baseUser = roleConfig[role as keyof typeof roleConfig] ?? roleConfig.admin
  const [displayName, setDisplayName] = useState(baseUser.name)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('shipedo_user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.name) setDisplayName(u.name)
      }
    } catch {}
  }, [])
  const user = { ...baseUser, name: displayName }
  const UserIcon = user.icon
  const w = mockSellerWallet

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

  const mask = (v: number) => hideBalance ? '••••••' : `KES ${v.toLocaleString()}`

  if (role === 'seller') {
    const availableUsd = (w.availableBalance / USD_RATE).toFixed(2)
    return (
      <>
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={onMenuToggle} className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <Menu size={22} />
          </button>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('search_dots')}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
            />
          </div>

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

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                          <Wallet size={13} className="text-white/60" />
                        </div>
                        <span className="text-white/60 text-xs">{t('hdr_total_balance')}</span>
                      </div>
                      <span className="text-[#f4991a] font-bold text-sm">{mask(w.totalBalance)}</span>
                    </div>
                    <div className="w-full h-px bg-white/10" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                          <TrendingUp size={13} className="text-green-400" />
                        </div>
                        <span className="text-white/60 text-xs">{t('hdr_available')}</span>
                      </div>
                      <span className="text-green-400 font-bold text-sm">{mask(w.availableBalance)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                          <Lock size={13} className="text-yellow-400" />
                        </div>
                        <span className="text-white/60 text-xs">{t('hdr_on_hold')}</span>
                      </div>
                      <span className="text-yellow-400 font-bold text-sm">{mask(w.onHoldBalance)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                          <Clock size={13} className="text-blue-400" />
                        </div>
                        <span className="text-white/60 text-xs">{t('hdr_pending_payout')}</span>
                      </div>
                      <span className="text-blue-400 font-bold text-sm">{mask(w.pendingBalance)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { setWalletOpen(false); setWithdrawOpen(true) }}
                    className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    <DollarSign size={13} /> {t('hdr_withdraw_usd')}
                  </button>
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
                      <Link href="/login" className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <LogOut size={14} /> {t('hdr_signout')}
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {withdrawOpen && <WithdrawModal onClose={() => setWithdrawOpen(false)} />}
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
          {/* Search */}
          <div className="relative hidden md:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              className="pl-8 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all w-44"
            />
          </div>

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
                    <Link href="/login" className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <LogOut size={14} /> Sign Out
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Withdraw modal — mounts outside header flow */}
      {withdrawOpen && <WithdrawModal onClose={() => setWithdrawOpen(false)} />}
    </>
  )
}
