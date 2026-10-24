'use client'

import { useCountry } from './CountryContext'

export function useCountryHeader(): Record<string, string> {
  const { country } = useCountry()
  if (country === 'ALL') return {}
  return { 'x-country': country }
}

export function useCountryParam(): string {
  const { country } = useCountry()
  if (country === 'ALL') return ''
  return `country=${country}`
}
