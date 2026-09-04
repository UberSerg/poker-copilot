import { collectUsedCards } from '../cards/cardUtils'
import { getPot } from '../math/pot'
import type { PokerState } from './PokerState'
import { POSITIONS_6MAX } from './Position'
import { isBettingRoundComplete } from './transitions'

export interface InvariantIssue {
  code: string
  message: string
}

export function validateStateInvariants(state: PokerState): InvariantIssue[] {
  const issues: InvariantIssue[] = []

  const potSum = getPot(state)
  if (state.pot !== potSum) {
    issues.push({
      code: 'POT_MISMATCH',
      message: `pot ${state.pot} !== sum committedTotal ${potSum}`,
    })
  }

  for (const position of POSITIONS_6MAX) {
    const player = state.players[position]
    if (!Number.isInteger(player.stackChips) || player.stackChips < 0) {
      issues.push({ code: 'STACK', message: `${position} invalid stackChips` })
    }
    if (!Number.isInteger(player.committedThisStreet) || player.committedThisStreet < 0) {
      issues.push({ code: 'COMMITTED', message: `${position} invalid committedThisStreet` })
    }
    if (!Number.isInteger(player.committedTotal) || player.committedTotal < 0) {
      issues.push({ code: 'COMMITTED', message: `${position} invalid committedTotal` })
    }
    if (player.startingStackChips !== player.stackChips + player.committedTotal) {
      issues.push({
        code: 'ECONOMICS',
        message: `${position} starting !== stack + committedTotal`,
      })
    }
    if (player.folded && player.allIn) {
      issues.push({ code: 'STATUS', message: `${position} folded and all-in` })
    }
    if (player.allIn && player.stackChips !== 0) {
      issues.push({ code: 'STATUS', message: `${position} all-in with stack>0` })
    }
    if (!player.folded && !player.allIn && player.committedThisStreet > state.currentBet) {
      issues.push({
        code: 'BET_LEVEL',
        message: `${position} committedThisStreet > currentBet`,
      })
    }
  }

  if (!Number.isInteger(state.currentBet) || state.currentBet < 0) {
    issues.push({ code: 'CURRENT_BET', message: 'currentBet must be non-negative integer' })
  }
  if (!Number.isInteger(state.lastFullRaiseSize) || state.lastFullRaiseSize < 0) {
    issues.push({ code: 'RAISE_SIZE', message: 'lastFullRaiseSize invalid' })
  }

  const usedList = [...state.heroCards, ...state.board].filter((card): card is NonNullable<typeof card> => card !== null)
  if (collectUsedCards(usedList).size !== usedList.length) {
    issues.push({ code: 'DUPLICATE_CARD', message: 'duplicate physical cards in state' })
  }

  if (isBettingRoundComplete(state) && !state.handComplete && state.actingPosition !== null) {
    issues.push({
      code: 'ACTING',
      message: 'actingPosition must be null when betting round is complete',
    })
  }

  return issues
}

export function assertStateInvariants(state: PokerState): void {
  const issues = validateStateInvariants(state)
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => `${issue.code}: ${issue.message}`).join('; '))
  }
}
