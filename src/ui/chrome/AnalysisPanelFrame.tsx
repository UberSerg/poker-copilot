import type { ReactNode } from 'react'

type Props = {
  title?: string
  children: ReactNode
  className?: string
}

export function AnalysisPanelFrame({ title, children, className = '' }: Props) {
  return (
    <section className={`analysis-panel ${className}`.trim()}>
      {title ? <h3 className="analysis-panel__title">{title}</h3> : null}
      {children}
    </section>
  )
}
