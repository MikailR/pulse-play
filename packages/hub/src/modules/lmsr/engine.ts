import type { Outcome } from './types.js';

/**
 * Cost function: C(q) = b * ln(e^(q_ball/b) + e^(q_strike/b))
 *
 * Uses the log-sum-exp trick for numerical stability:
 *   ln(e^a + e^b) = max(a,b) + ln(e^(a-max) + e^(b-max))
 */
export function costFunction(qBall: number, qStrike: number, b: number): number {
  const a = qBall / b;
  const c = qStrike / b;
  const max = Math.max(a, c);
  return b * (max + Math.log(Math.exp(a - max) + Math.exp(c - max)));
}

/**
 * Price for an outcome: p_i = e^(q_i/b) / (e^(q_ball/b) + e^(q_strike/b))
 *
 * Uses softmax with numerical stability trick.
 */
export function getPrice(qBall: number, qStrike: number, b: number, outcome: Outcome): number {
  const a = qBall / b;
  const c = qStrike / b;
  const max = Math.max(a, c);
  const expA = Math.exp(a - max);
  const expC = Math.exp(c - max);
  const sum = expA + expC;
  return outcome === 'BALL' ? expA / sum : expC / sum;
}

/**
 * Cost to buy `shares` of an outcome.
 * cost = C(q_new) - C(q_old)
 */
export function getCost(
  qBall: number,
  qStrike: number,
  b: number,
  outcome: Outcome,
  shares: number,
): number {
  const { qBall: newQBall, qStrike: newQStrike } = getNewQuantities(qBall, qStrike, outcome, shares);
  return costFunction(newQBall, newQStrike, b) - costFunction(qBall, qStrike, b);
}

/**
 * Shares received for a given cost (inverse of getCost).
 * Uses binary search since the cost function is monotonically increasing in shares.
 */
export function getShares(
  qBall: number,
  qStrike: number,
  b: number,
  outcome: Outcome,
  cost: number,
): number {
  if (cost <= 0) return 0;

  // Upper bound: in the best case (price ~ 0), you'd get at most cost/epsilon shares.
  // A safe upper bound is cost * 2 / minPrice, but we can just use a generous bound.
  let lo = 0;
  let hi = cost / getPrice(qBall, qStrike, b, outcome) * 2;

  // Ensure hi actually exceeds the target cost
  while (getCost(qBall, qStrike, b, outcome, hi) < cost) {
    hi *= 2;
  }

  // Binary search
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const midCost = getCost(qBall, qStrike, b, outcome, mid);
    if (Math.abs(midCost - cost) < 1e-10) {
      return mid;
    }
    if (midCost < cost) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

/**
 * Updated quantities after purchasing shares of an outcome.
 */
export function getNewQuantities(
  qBall: number,
  qStrike: number,
  outcome: Outcome,
  shares: number,
): { qBall: number; qStrike: number } {
  return outcome === 'BALL'
    ? { qBall: qBall + shares, qStrike }
    : { qBall, qStrike: qStrike + shares };
}
