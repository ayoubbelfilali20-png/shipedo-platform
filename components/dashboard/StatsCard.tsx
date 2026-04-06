import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  change?: { value: string; positive: boolean }
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  description?: string
}

export default function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-[#f4991a]',
  iconBg = 'bg-orange-50',
  description,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 card-hover shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon size={22} className={iconColor} />
        </div>
        {change && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
            change.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          )}>
            {change.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {change.value}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-[#1a1c3a] mb-1">{value}</div>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      {description && <div className="text-xs text-gray-400 mt-1">{description}</div>}
    </div>
  )
}
