import type { ReactNode } from 'react'

type Props = {
  label: string
  value: ReactNode
  className?: string
}

export function MetricCard({ label, value, className = '' }: Props) {
  return (
    <div className={`metric-card ${className}`.trim()}>
      <span className="metric-card__label">{label}</span>
      <div className="metric-card__value">{value}</div>
    </div>
  )
}
