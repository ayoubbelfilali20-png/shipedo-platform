import { OrderStatus } from '@/lib/types'
import { getStatusConfig } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: OrderStatus
  showDot?: boolean
}

export default function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const config = getStatusConfig(status)

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
      config.className
    )}>
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />}
      {config.label}
    </span>
  )
}
