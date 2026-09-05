import type { Rank } from '../../domain/cards/Card'
import { isRank } from '../../domain/cards/Card'
import {
  nonPairInterval,
  nonPairPlus,
  pairInterval,
  pairPlus,
} from './allHandClasses'
import {
  createHandClass,
  formatHandClass,
  parseHandClassToken,
  type HandClass,
} from './HandClass'
import { PokerRange } from './Range'

export type RangeParseErrorCode =
  | 'EMPTY_TOKEN'
  | 'UNRECOGNIZED'
  | 'INVALID_SUITEDNESS'
  | 'INVALID_ORDER'
  | 'INVALID_INTERVAL'
  | 'INVALID_WEIGHT'
  | 'PAIR_SUITEDNESS'

export interface RangeParseError {
  code: RangeParseErrorCode
  token: string
  messageRu: string
}

export type RangeParseResult =
  | { ok: true; range: PokerRange; classWeights: Map<string, number> }
  | { ok: false; errors: RangeParseError[] }

function error(
  code: RangeParseErrorCode,
  token: string,
  messageRu: string,
): RangeParseError {
  return { code, token, messageRu }
}

function parseWeightSuffix(raw: string): { body: string; weight: number } | RangeParseError {
  const idx = raw.indexOf(':')
  if (idx < 0) {
    return { body: raw, weight: 1 }
  }
  const body = raw.slice(0, idx).trim()
  const weightPart = raw.slice(idx + 1).trim()
  if (!weightPart.endsWith('%')) {
    return error('INVALID_WEIGHT', raw, `Некорректный вес: "${raw}"`)
  }
  const numText = weightPart.slice(0, -1).trim()
  const value = Number(numText)
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return error('INVALID_WEIGHT', raw, `Некорректный вес: "${raw}"`)
  }
  return { body, weight: value / 100 }
}

function expandToken(body: string): HandClass[] | RangeParseError {
  const token = body.trim()
  if (!token) {
    return error('EMPTY_TOKEN', body, 'Пустой фрагмент диапазона')
  }

  // Reject obvious invalids early
  if (/^[AKQJT98765432]{2}$/i.test(token) === false) {
    // continue — may be longer patterns
  }

  if (token === 'AK' || /^[AKQJT98765432]{2}$/.test(token) && token[0] !== token[1]) {
    return error(
      'UNRECOGNIZED',
      token,
      `Не удалось распознать: "${token}" (укажите s или o)`,
    )
  }

  // Plus pairs: 22+, TT+
  if (/^[AKQJT98765432]{2}\+$/.test(token)) {
    const a = token[0]!
    const b = token[1]!
    if (!isRank(a) || !isRank(b) || a !== b) {
      return error('UNRECOGNIZED', token, `Не удалось распознать: "${token}"`)
    }
    return pairPlus(a)
  }

  // Plus non-pair: AJs+, ATo+
  if (/^[AKQJT98765432][AKQJT98765432][so]\+$/.test(token)) {
    const base = parseHandClassToken(token.slice(0, -1))
    if (!base) {
      return error('UNRECOGNIZED', token, `Не удалось распознать: "${token}"`)
    }
    const expanded = nonPairPlus(base)
    if (!expanded) {
      return error('UNRECOGNIZED', token, `Не удалось распознать: "${token}"`)
    }
    return expanded
  }

  // Interval: 66-TT or ATs-AQs
  if (token.includes('-')) {
    const parts = token.split('-')
    if (parts.length !== 2) {
      return error('INVALID_INTERVAL', token, `Некорректный интервал: "${token}"`)
    }
    const left = parseHandClassToken(parts[0]!.trim())
    const right = parseHandClassToken(parts[1]!.trim())
    if (!left || !right) {
      return error('UNRECOGNIZED', token, `Не удалось распознать: "${token}"`)
    }
    if (left.suitedness === 'PAIR' && right.suitedness === 'PAIR') {
      const interval = pairInterval(left.highRank, right.highRank)
      if (!interval) {
        return error(
          'INVALID_ORDER',
          token,
          `Диапазон "${token}" задан в неверном порядке`,
        )
      }
      return interval
    }
    const interval = nonPairInterval(left, right)
    if (!interval) {
      return error(
        'INVALID_ORDER',
        token,
        `Диапазон "${token}" задан в неверном порядке`,
      )
    }
    return interval
  }

  // Reject pair with suitedness: AAo, 22s
  if (/^([AKQJT98765432])\1[so]$/.test(token)) {
    return error(
      'PAIR_SUITEDNESS',
      token,
      'Для пары нельзя указывать suited/offsuit',
    )
  }

  // Reject KAs (wrong order), AXs, AKx, QQ++
  if (token.endsWith('++') || /x/i.test(token)) {
    return error('UNRECOGNIZED', token, `Не удалось распознать: "${token}"`)
  }

  const single = parseHandClassToken(token)
  if (!single) {
    // Wrong order like KAs
    if (/^[AKQJT98765432]{2}[so]$/.test(token)) {
      const a = token[0]!
      const b = token[1]!
      if (isRank(a) && isRank(b) && a !== b) {
        return error(
          'INVALID_ORDER',
          token,
          `Не удалось распознать: "${token}" (ожидается старшая карта первой)`,
        )
      }
    }
    if (/^([AKQJT98765432])\1[so]$/.test(token)) {
      return error(
        'PAIR_SUITEDNESS',
        token,
        'Для пары нельзя указывать suited/offsuit',
      )
    }
    return error('UNRECOGNIZED', token, `Не удалось распознать: "${token}"`)
  }
  return [single]
}

/**
 * Parse poker range text.
 * Overlapping tokens: last explicit token wins for affected hand classes.
 */
export function parseRange(text: string): RangeParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: true, range: PokerRange.empty(), classWeights: new Map() }
  }

  const tokens = trimmed.split(',').map((t) => t.trim()).filter(Boolean)
  const classWeights = new Map<string, number>()
  const errors: RangeParseError[] = []

  for (const raw of tokens) {
    const weightParsed = parseWeightSuffix(raw)
    if ('code' in weightParsed) {
      errors.push(weightParsed)
      continue
    }
    const expanded = expandToken(weightParsed.body)
    if (!Array.isArray(expanded)) {
      errors.push(expanded)
      continue
    }
    for (const hand of expanded) {
      classWeights.set(formatHandClass(hand), weightParsed.weight)
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    range: PokerRange.fromHandClassWeights(classWeights),
    classWeights,
  }
}

export function isRankPairChars(a: string, b: string): a is Rank {
  return isRank(a) && isRank(b) && a === b
}

export function createHandClassSafe(
  high: Rank,
  low: Rank,
  suitedness: 'PAIR' | 'SUITED' | 'OFFSUIT',
): HandClass {
  return createHandClass(high, low, suitedness)
}
