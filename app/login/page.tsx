'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Truck, Eye, EyeOff, ArrowRight, Mail, Lock, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { setUser } from '@/lib/auth'

const ADMIN_EMAIL = 'ayoub.belfilali20@gmail.com'
const ADMIN_PASSWORD = 'ayoubilyas@20'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Admin hardcoded login
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        setUser({ role: 'admin', email: ADMIN_EMAIL, name: 'Admin' })
        router.push('/dashboard')
        setLoading(false)
        return
      }

      // Try seller
      let seller: any = null
      let sellerErr: any = null
      try {
        const res = await supabase
          .from('sellers')
          .select('id, email, password, status, name, company')
          .eq('email', email)
          .limit(1)
        seller = res.data?.[0] || null
        sellerErr = res.error
      } catch (ex) {
        console.error('Seller query crash:', ex)
        sellerErr = ex
      }

      if (seller && seller.password === password) {
        if (seller.status === 'suspended') {
          setError('Your account is suspended. Contact admin.')
          setLoading(false)
          return
        }
        setUser({
          role: 'seller', id: seller.id, email: seller.email,
          name: seller.company || seller.name, fullName: seller.name,
        })
        router.push('/seller')
        setLoading(false)
        return
      }

      // Try agent
      let agent: any = null
      let agentErr: any = null
      try {
        const res = await supabase
          .from('agents')
          .select('id, email, password, status, name')
          .eq('email', email)
          .limit(1)
        agent = res.data?.[0] || null
        agentErr = res.error
      } catch (ex) {
        console.error('Agent query crash:', ex)
        agentErr = ex
      }

      if (agent && agent.password === password) {
        if (agent.status === 'inactive' || agent.status === 'suspended') {
          setError('Your account is inactive. Contact admin.')
          setLoading(false)
          return
        }
        setUser({ role: 'agent', id: agent.id, email: agent.email, name: agent.name })
        router.push('/agent')
        setLoading(false)
        return
      }

      setLoading(false)
      const dbErr = sellerErr || agentErr
      setError(dbErr ? `Database error: ${dbErr.message || dbErr}` : 'Invalid email or password.')
    } catch (err: any) {
      console.error('Login error:', err)
      setLoading(false)
      setError(`Error: ${err.message || err}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1129] relative overflow-hidden flex items-center justify-center p-5">
      {/* Ambient background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#f4991a] rounded-full blur-[120px] opacity-25 pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[380px] h-[380px] bg-blue-500 rounded-full blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500 rounded-full blur-[140px] opacity-10 pointer-events-none" />

      <div className="relative w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 bg-gradient-to-br from-[#f4991a] to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 mb-3">
            <Truck size={26} className="text-white" />
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">Shipedo</h1>
          <p className="text-white/40 text-xs mt-1">Logistics & COD platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-7 shadow-2xl shadow-black/50">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[#0f1129]">Welcome back</h2>
            <p className="text-gray-400 text-xs mt-1">Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-[#0f1129] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-[#0f1129] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] focus:bg-white transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-[#f4991a] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <div className="w-1 self-stretch bg-red-400 rounded-full flex-shrink-0" />
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#f4991a] to-orange-500 hover:from-orange-500 hover:to-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
            <Shield size={11} />
            <span>Secured · End-to-end encrypted</span>
          </div>
        </div>

        <p className="text-center text-white/30 text-[10px] mt-6">© 2026 Shipedo · All rights reserved</p>
      </div>
    </div>
  )
}
