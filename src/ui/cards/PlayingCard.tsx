import { formatCard, getSuit, isRedSuit, type Card } from '../../domain/cards/Card'
import './PlayingCard.css'

interface PlayingCardProps {
  card: Card | null
  large?: boolean
  selected?: boolean
  onClick?: () => void
  label?: string
}

export function PlayingCard({ card, large = false, selected = false, onClick, label }: PlayingCardProps) {
  const className = [
    'playing-card',
    large ? 'playing-card-large' : '',
    selected ? 'playing-card-selected' : '',
    card ? (isRedSuit(getSuit(card)) ? 'playing-card-red' : 'playing-card-black') : 'playing-card-empty',
    onClick ? 'playing-card-clickable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={className} onClick={onClick} disabled={!onClick} aria-label={label}>
      {card ? formatCard(card) : label ?? '—'}
    </button>
  )
}
