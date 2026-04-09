'use client'

import { fmtUsd, fmtKes, toKes, USD_TO_KES } from '@/lib/currency'
import { cn } from '@/lib/utils'

interface MoneyProps {
  /** Value in USD (the canonical currency). */
  usd: number
  /** Set to false to hide the KES line. */
  showKes?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClass: Record<NonNullable<MoneyProps['size']>, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-2xl',
}

export default function Money({ usd, showKes = true, className, size = 'md' }: MoneyProps) {
  return (
    <span className={cn('inline-flex flex-col leading-tight', className)}>
      <span className={cn('font-bold text-[#1a1c3a]', sizeClass[size])}>{fmtUsd(usd)}</span>
      {showKes && (
        <span className="text-[10px] text-gray-400 font-medium">{fmtKes(toKes(usd))}</span>
      )}
    </span>
  )
}

export { USD_TO_KES }
