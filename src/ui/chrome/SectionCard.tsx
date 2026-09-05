import type { ReactNode } from 'react'

type Props = {
  title?: string
  children: ReactNode
  className?: string
}

export function SectionCard({ title, children, className = '' }: Props) {
  return (
    <div className={`section-card ${className}`.trim()}>
      {title ? <h4 className="section-card__title">{title}</h4> : null}
      {children}
    </div>
  )
}
