'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Truck, Lock, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const params = useSearchParams()
  const token  = params.get('token') ?? ''

  const [checking, setChecking] = useState(true)
  const [valid, setValid]       = useState(false)
  const [reason, setReason]     = useState('')
  const [email, setEmail]       = useState('')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [show, setShow]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  useEffect(() => {
    if (!token) { setChecking(false); setValid(false); setReason('missing token'); return }
    ;(async () => {
      try {
        const res = await fetch(`/api/auth/reset?token=${encodeURIComponent(token)}`)
        const json = await res.json()
        setValid(!!json.valid)
        if (!json.valid) setReason(json.reason || 'invalid')
        if (json.email) setEmail(json.email)
      } catch {
        setValid(false); setReason('network error')
      } finally {
        setChecking(false)
      }
    })()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const json = await res.json()
      if (!res.ok || json.success === false) {
        setError(json.error || 'Something went wrong. Try again.')
      } else {
        setDone(true)
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1129] relative overflow-hidden flex items-center justify-center p-5">
      <div className="absolute top-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#f4991a] rounded-full blur-[120px] opacity-25 pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[380px] h-[380px] bg-blue-500 rounded-full blur-[120px] opacity-20 pointer-events-none" />

      <div className="relative w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 bg-gradient-to-br from-[#f4991a] to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 mb-3">
            <Truck size={26} className="text-white" />
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">Shipedo</h1>
          <p className="text-white/40 text-xs mt-1">Set a new password</p>
        </div>

        <div className="bg-white rounded-3xl p-7 shadow-2xl shadow-black/50">
          {checking ? (
            <div className="py-10 flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-[#f4991a] rounded-full animate-spin" />
              <p className="text-xs text-gray-400 mt-3">Checking your link…</p>
            </div>
          ) : !valid ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-[#0f1129] mb-2">Link not valid</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                This reset link is {reason}. Please request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-1.5 mt-6 text-[#f4991a] text-sm font-bold hover:underline"
              >
                Request new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-[#0f1129] mb-2">Password updated</h2>
              <p className="text-sm text-gray-500">You can now sign in with your new password.</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 mt-6 text-[#f4991a] text-sm font-bold hover:underline"
              >
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-[#0f1129]">New password</h2>
                <p className="text-gray-400 text-xs mt-1">
                  {email ? <>For <strong className="text-[#1a1c3a]">{email}</strong></> : 'Set a new password for your account'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">New password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-[#0f1129] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] focus:bg-white transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                    >
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      type={show ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-[#0f1129] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] focus:bg-white transition-all"
                      required
                    />
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
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : 'Update password'}
                </button>
              </form>

              <Link
                href="/login"
                className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-[#f4991a] transition-colors"
              >
                <ArrowLeft size={12} /> Back to sign in
              </Link>
            </>
          )}
        </div>

        <p className="text-center text-white/30 text-[10px] mt-6">© 2026 Shipedo · All rights reserved</p>
      </div>
    </div>
  )
}
