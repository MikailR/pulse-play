/**
 * Cost function: C(q) = b * ln(sum_i(e^(q_i/b)))
 *
 * Uses the log-sum-exp trick for numerical stability:
 *   ln(sum(e^a_i)) = max(a) + ln(sum(e^(a_i - max)))
 */
export function costFunction(quantities: number[], b: number): number {
  const scaled = quantities.map((q) => q / b);
  const max = Math.max(...scaled);
  const sumExp = scaled.reduce((sum, s) => sum + Math.exp(s - max), 0);
  return b * (max + Math.log(sumExp));
}

/**
 * Price for an outcome at index: p_i = e^(q_i/b) / sum_j(e^(q_j/b))
 *
 * Uses softmax with numerical stability trick.
 */
export function getPrice(quantities: number[], b: number, outcomeIndex: number): number {
  const scaled = quantities.map((q) => q / b);
  const max = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, e) => a + e, 0);
  return exps[outcomeIndex] / sum;
}

/**
 * All prices at once (more efficient than calling getPrice N times).
 */
export function getPrices(quantities: number[], b: number): number[] {
  const scaled = quantities.map((q) => q / b);
  const max = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, e) => a + e, 0);
  return exps.map((e) => e / sum);
}

/**
 * Cost to buy `shares` of an outcome at index.
 * cost = C(q_new) - C(q_old)
 */
export function getCost(
  quantities: number[],
  b: number,
  outcomeIndex: number,
  shares: number,
): number {
  const newQuantities = getNewQuantities(quantities, outcomeIndex, shares);
  return costFunction(newQuantities, b) - costFunction(quantities, b);
}

/**
 * Shares received for a given cost (inverse of getCost).
 * Uses binary search since the cost function is monotonically increasing in shares.
 */
export function getShares(
  quantities: number[],
  b: number,
  outcomeIndex: number,
  cost: number,
): number {
  if (cost <= 0) return 0;

  // Upper bound: use current price as starting estimate
  let lo = 0;
  let hi = cost / getPrice(quantities, b, outcomeIndex) * 2;

  // Ensure hi actually exceeds the target cost
  while (getCost(quantities, b, outcomeIndex, hi) < cost) {
    hi *= 2;
  }

  // Binary search
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const midCost = getCost(quantities, b, outcomeIndex, mid);
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
 * Updated quantities after purchasing shares of an outcome at index.
 */
export function getNewQuantities(
  quantities: number[],
  outcomeIndex: number,
  shares: number,
): number[] {
  return quantities.map((q, i) => (i === outcomeIndex ? q + shares : q));
}
