/** Thresholds for rule-based Decision Engine V1 (not GTO). */

/** Facing bet: fold when equity < required − margin; clear call when ≥ required + margin. */
export const DECISION_SAFETY_MARGIN = 0.04

/** |equity − required| ≥ this → HIGH confidence */
export const CONFIDENCE_HIGH_GAP = 0.15

/** |equity − required| ≥ this (and < HIGH) → MEDIUM; else LOW */
export const CONFIDENCE_MEDIUM_GAP = 0.05

/** No bet facing: allow BET baseline when equity ≥ this */
export const BET_EQUITY_THRESHOLD = 0.6

/** Facing bet: allow RAISE baseline when equity ≥ this */
export const RAISE_EQUITY_THRESHOLD = 0.7

/** Default bet pot fraction when betting */
export const DEFAULT_BET_POT_FRACTION = 0.5

/** Allowed bet pot fractions (choose closest legal to default) */
export const BET_POT_FRACTIONS = [0.33, 0.5, 0.66, 0.75, 1] as const

/** Raise-to multiplier vs current bet */
export const RAISE_TO_MULTIPLIER = 2.5
