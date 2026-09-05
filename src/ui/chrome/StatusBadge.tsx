import type { ReactNode } from 'react'

type Tone = 'info' | 'success' | 'warning' | 'danger'

type Props = {
  children: ReactNode
  tone?: Tone
  className?: string
}

export function StatusBadge({ children, tone = 'info', className = '' }: Props) {
  return (
    <span className={`status-badge status-badge--${tone} ${className}`.trim()}>{children}</span>
  )
}
