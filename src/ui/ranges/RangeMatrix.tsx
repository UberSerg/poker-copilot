import type { HandClass } from '../../engine/ranges/HandClass'
import { formatHandClass, MATRIX_RANKS } from '../../engine/ranges/HandClass'
import { createHandClass } from '../../engine/ranges/HandClass'
import type { PokerRange } from '../../engine/ranges/Range'
import './RangeMatrix.css'

export interface RangeMatrixProps {
  range: PokerRange
  selectedKey: string | null
  onSelect: (hand: HandClass) => void
  onToggle: (hand: HandClass) => void
}

/**
 * 13×13 starting-hand matrix.
 * Above diagonal = suited, below = offsuit, diagonal = pairs.
 */
export function RangeMatrix({ range, selectedKey, onSelect, onToggle }: RangeMatrixProps) {
  const classWeights = range.toHandClassWeights()

  return (
    <div className="range-matrix-scroll">
      <table className="range-matrix" aria-label="Матрица диапазона 13 на 13">
        <thead>
          <tr>
            <th />
            {MATRIX_RANKS.map((r) => (
              <th key={r}>{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX_RANKS.map((rowRank, rowIdx) => (
            <tr key={rowRank}>
              <th>{rowRank}</th>
              {MATRIX_RANKS.map((colRank, colIdx) => {
                let hand: HandClass
                if (rowIdx === colIdx) {
                  hand = createHandClass(rowRank, rowRank, 'PAIR')
                } else if (rowIdx < colIdx) {
                  // above diagonal visually: row is higher index in A..2? 
                  // rowIdx < colIdx means col is further right = lower rank when MATRIX is A..2
                  // Actually MATRIX_RANKS = A K Q ... 2, so colIdx > rowIdx means colRank is lower.
                  // Suited: high=rowRank, low=colRank when row is left of... wait
                  // Standard: row labels A..2 top to bottom, col A..2 left to right.
                  // Cell (row=A, col=K) is above diagonal when? A is row 0, K is col 1 → rowIdx < colIdx → suited AKs
                  hand = createHandClass(rowRank, colRank, 'SUITED')
                } else {
                  // below diagonal: offsuit, high=colRank, low=rowRank
                  hand = createHandClass(colRank, rowRank, 'OFFSUIT')
                }
                const key = formatHandClass(hand)
                const weight = classWeights.get(key) ?? 0
                const selected = selectedKey === key
                return (
                  <td key={key}>
                    <button
                      type="button"
                      className={[
                        'range-cell',
                        weight > 0 ? 'range-cell--on' : '',
                        selected ? 'range-cell--selected' : '',
                        hand.suitedness === 'PAIR'
                          ? 'range-cell--pair'
                          : hand.suitedness === 'SUITED'
                            ? 'range-cell--suited'
                            : 'range-cell--offsuit',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={
                        weight > 0 && weight < 1
                          ? { opacity: 0.35 + weight * 0.65 }
                          : undefined
                      }
                      title={weight > 0 && weight < 1 ? `${key} ${Math.round(weight * 100)}%` : key}
                      onClick={() => {
                        onSelect(hand)
                        onToggle(hand)
                      }}
                    >
                      {key}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
