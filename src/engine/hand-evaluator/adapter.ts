import type { HandEvaluator } from './HandEvaluator'
import { createHandEvaluatorAdapter } from './pokerToolsStrength'

/**
 * Sole factory for UI — native bestFive/categories behind adapter.
 * Equity hot path uses pokerToolsStrength.compareHoleBoards separately.
 *
 * Dependency: @pokertools/evaluator (MIT) — lookup-table strength for MC/exact loops only.
 * Justification: pure TS, browser-safe, maintained 2026, avoids 5s MC on 50k with naive C(7,5).
 */
export function getDefaultHandEvaluator(): HandEvaluator {
  return createHandEvaluatorAdapter()
}
