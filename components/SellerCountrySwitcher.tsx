'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { COUNTRIES, type CountryCode } from '@/lib/countries'

export default function SellerCountrySwitcher() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<CountryCode>('KE')
  const [available, setAvailable] = useState<CountryCode[]>(['KE'])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('shipedo_seller') || '{}')
      if (u.country) setCurrent(u.country as CountryCode)
      if (u.countries && u.countries.length > 0) {
        setAvailable(u.countries as CountryCode[])
      } else if (u.country) {
        setAvailable([u.country as CountryCode])
      }
    } catch {}
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const switchCountry = (code: CountryCode) => {
    try {
      const u = JSON.parse(localStorage.getItem('shipedo_seller') || '{}')
      u.country = code
      localStorage.setItem('shipedo_seller', JSON.stringify(u))
    } catch {}
    setOpen(false)
    window.location.reload()
  }

  const c = COUNTRIES[current]
  const canSwitch = available.length > 1

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => canSwitch && setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl transition-all shadow-sm ${
          canSwitch ? 'hover:bg-gray-50 hover:border-gray-300 cursor-pointer' : 'cursor-default'
        }`}
      >
        <span className="text-lg leading-none">{c?.flag}</span>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[11px] font-bold text-[#1a1c3a]">{c?.name}</span>
          <span className="text-[9px] font-semibold text-gray-400 mt-0.5">{c?.currency}</span>
        </div>
        {canSwitch && <ChevronDown size={12} className="text-gray-400" />}
      </button>

      {open && canSwitch && (
        <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden p-1.5">
          {available.map(code => {
            const cc = COUNTRIES[code]
            if (!cc) return null
            return (
              <button
                key={code}
                onClick={() => switchCountry(code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-all ${
                  current === code
                    ? 'bg-orange-50 text-[#f4991a] font-bold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg leading-none">{cc.flag}</span>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-semibold">{cc.name}</span>
                  <span className="text-[10px] text-gray-400">{cc.currency}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
