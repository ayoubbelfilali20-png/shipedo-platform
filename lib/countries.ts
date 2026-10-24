export type CountryCode = 'KE' | 'TZ'

export interface CountryConfig {
  code: CountryCode
  name: string
  flag: string
  currency: string
  currencySymbol: string
  phonePrefix: string
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  KE: {
    code: 'KE',
    name: 'Kenya',
    flag: '🇰🇪',
    currency: 'KES',
    currencySymbol: 'KES',
    phonePrefix: '+254',
  },
  TZ: {
    code: 'TZ',
    name: 'Tanzania',
    flag: '🇹🇿',
    currency: 'TZS',
    currencySymbol: 'TZS',
    phonePrefix: '+255',
  },
}

export const COUNTRY_LIST = Object.values(COUNTRIES)
export const ALL_COUNTRY_CODES: CountryCode[] = ['KE', 'TZ']

export function getCountry(code: string): CountryConfig {
  return COUNTRIES[code as CountryCode] || COUNTRIES.KE
}

export function fmtLocalCurrency(amount: number, country: CountryCode): string {
  return `${COUNTRIES[country].currencySymbol} ${(amount || 0).toLocaleString('en-US')}`
}
