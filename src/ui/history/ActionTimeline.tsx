import { formatBb } from '../../domain/math/chips'
import type { PokerActionRecord } from '../../domain/game/PokerAction'
import type { Street } from '../../domain/game/Street'
import { STREETS } from '../../domain/game/Street'
import { ru } from '../../i18n/ru'
import './ActionTimeline.css'

interface ActionTimelineProps {
  history: PokerActionRecord[]
  bigBlind: number
}

function formatAction(record: PokerActionRecord, bigBlind: number): string {
  const action = record.action
  switch (action.type) {
    case 'FOLD':
      return ru.actions.FOLD
    case 'CHECK':
      return ru.actions.CHECK
    case 'CALL':
      return `${ru.actions.CALL} ${formatBb(record.stackBefore - record.stackAfter, bigBlind)} ${ru.labels.bb}`
    case 'BET':
      return `${ru.actions.BET} ${formatBb(action.amountChips, bigBlind)} ${ru.labels.bb}`
    case 'RAISE':
      return `${ru.actions.RAISE} ${ru.labels.raiseTo.toLowerCase()} ${formatBb(action.raiseToChips, bigBlind)} ${ru.labels.bb}`
    case 'POST_BLIND':
      return `${action.blind} — ${formatBb(action.amountChips, bigBlind)} ${ru.labels.bb}`
  }
}

export function ActionTimeline({ history, bigBlind }: ActionTimelineProps) {
  const byStreet = STREETS.map((street) => ({
    street,
    items: history.filter((item) => item.street === street),
  })).filter((group) => group.items.length > 0)

  return (
    <section className="action-timeline" aria-labelledby="history-title">
      <h2 id="history-title">{ru.panels.history}</h2>
      {byStreet.map((group) => (
        <div key={group.street} className="timeline-street">
          <h3>{ru.streets[group.street as Street]}</h3>
          <ul>
            {group.items.map((item) => (
              <li key={item.sequence}>
                <strong>{item.position}</strong> — {formatAction(item, bigBlind)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
