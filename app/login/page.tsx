'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Truck, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react'

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
    await new Promise(r => setTimeout(r, 800))

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      router.push('/dashboard')
    } else {
      setLoading(false)
      setError('Invalid email or password.')
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1c3a] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-80 h-80 bg-[#f4991a] rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-60 h-60 bg-blue-500 rounded-full blur-3xl" />
        </div>

        <Link href="/" className="relative flex items-center gap-2">
          <div className="w-9 h-9 bg-[#f4991a] rounded-xl flex items-center justify-center">
            <Truck size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">Shipedo</span>
        </Link>

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-[#f4991a]/10 border border-[#f4991a]/20 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 bg-[#f4991a] rounded-full" />
            <span className="text-[#f4991a] text-xs font-medium">Live Platform</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Manage Your<br />
            <span className="text-[#f4991a]">Logistics</span> From<br />
            One Dashboard
          </h2>
          <p className="text-white/50 leading-relaxed max-w-sm">
            Track orders, manage COD payments, and confirm deliveries in real-time.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Orders Today', value: '0', icon: '📦' },
              { label: 'Delivered', value: '0', icon: '✅' },
              { label: 'COD Collected', value: '0', icon: '💵' },
              { label: 'Delivery Rate', value: '0%', icon: '🚀' },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-white font-bold text-lg">{s.value}</div>
                <div className="text-white/40 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/30 text-xs">© 2024 Shipedo</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-[#f4991a] rounded-xl flex items-center justify-center">
              <Truck size={20} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl">Shipedo</span>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <h1 className="text-2xl font-bold text-[#1a1c3a] mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm mb-6">Sign in to your Shipedo account</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/30 focus:border-[#f4991a] transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/30 focus:border-[#f4991a] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-[#f4991a]" />
                  <span className="text-gray-600">Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a1c3a] hover:bg-[#252750] disabled:opacity-70 text-white font-semibold py-3.5 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield size={12} />
              <span>Secured with 256-bit encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
