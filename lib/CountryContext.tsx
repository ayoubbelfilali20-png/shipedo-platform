'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type CountryCode, COUNTRIES } from './countries'

type CountryFilter = CountryCode | 'ALL'

interface CountryContextValue {
  country: CountryFilter
  setCountry: (c: CountryFilter) => void
  isAdmin: boolean
}

const Ctx = createContext<CountryContextValue>({
  country: 'KE',
  setCountry: () => {},
  isAdmin: false,
})

export function useCountry() {
  return useContext(Ctx)
}

export function CountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<CountryFilter>('KE')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    try {
      const admin = localStorage.getItem('shipedo_admin')
      const tl = localStorage.getItem('shipedo_teamleader')
      if (admin || tl) {
        setIsAdmin(true)
        const saved = localStorage.getItem('shipedo_country')
        if (saved === 'KE' || saved === 'TZ' || saved === 'ALL') {
          setCountryState(saved)
        }
      } else {
        const seller = localStorage.getItem('shipedo_seller')
        const agent = localStorage.getItem('shipedo_agent')
        const delivery = localStorage.getItem('shipedo_delivery')
        const storage = localStorage.getItem('shipedo_storage')
        const user = seller || agent || delivery || storage
        if (user) {
          try {
            const parsed = JSON.parse(user)
            if (parsed.country === 'TZ') setCountryState('TZ')
          } catch {}
        }
      }
    } catch {}
  }, [])

  const setCountry = (c: CountryFilter) => {
    setCountryState(c)
    try { localStorage.setItem('shipedo_country', c) } catch {}
  }

  return (
    <Ctx.Provider value={{ country, setCountry, isAdmin }}>
      {children}
    </Ctx.Provider>
  )
}
