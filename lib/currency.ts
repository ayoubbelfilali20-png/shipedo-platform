// All wallet/invoice money is stored in USD.
// KES is display-only, derived from this rate.
export const USD_TO_KES = 130

export function toKes(usd: number): number {
  return Math.round(usd * USD_TO_KES)
}

export function toUsd(kes: number): number {
  return Number((kes / USD_TO_KES).toFixed(2))
}

export function fmtUsd(n: number): string {
  return `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function fmtKes(n: number): string {
  return `KES ${(n || 0).toLocaleString('en-US')}`
}

/** Format a USD value with KES equivalent underneath (for display). */
export function fmtUsdKes(usd: number): { usd: string; kes: string } {
  return { usd: fmtUsd(usd), kes: fmtKes(toKes(usd)) }
}
