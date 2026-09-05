import { formatCard, getRank, getSuit, type Card } from '../../domain/cards/Card'
import { cardBackStyle, cardEmptyStyle, cardFaceStyle } from '../theme/spriteMap'
import './PlayingCard.css'

interface PlayingCardProps {
  card: Card | null
  large?: boolean
  selected?: boolean
  faceDown?: boolean
  onClick?: () => void
  label?: string
}

export function PlayingCard({
  card,
  large = false,
  selected = false,
  faceDown = false,
  onClick,
  label,
}: PlayingCardProps) {
  const aria = label ?? (card ? formatCard(card) : 'пусто')
  const className = [
    'playing-card',
    'playing-card-sprite',
    large ? 'playing-card-large' : '',
    selected ? 'playing-card-selected' : '',
    !card ? 'playing-card-empty' : '',
    onClick ? 'playing-card-clickable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const style = !card
    ? cardEmptyStyle()
    : faceDown
      ? cardBackStyle()
      : cardFaceStyle(getRank(card), getSuit(card))

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={onClick}
      disabled={!onClick}
      aria-label={aria}
      title={aria}
    >
      <span className="playing-card-sr">{aria}</span>
    </button>
  )
}
