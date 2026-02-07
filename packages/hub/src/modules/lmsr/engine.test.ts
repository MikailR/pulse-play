import { costFunction, getPrice, getPrices, getCost, getShares, getNewQuantities } from './engine';

const DEFAULT_B = 100;

describe('LMSR Engine', () => {
  // ─── Price calculation (2 outcomes) ─────────────────────────────

  describe('getPrice', () => {
    test('1. Equal quantities → both prices = 0.5', () => {
      expect(getPrice([0, 0], DEFAULT_B, 0)).toBeCloseTo(0.5);
      expect(getPrice([0, 0], DEFAULT_B, 1)).toBeCloseTo(0.5);
    });

    test('2. Higher q[0] → price[0] > price[1]', () => {
      const p0 = getPrice([50, 0], DEFAULT_B, 0);
      const p1 = getPrice([50, 0], DEFAULT_B, 1);
      expect(p0).toBeGreaterThan(p1);
    });

    test('3. Higher q[1] → price[1] > price[0]', () => {
      const p0 = getPrice([0, 50], DEFAULT_B, 0);
      const p1 = getPrice([0, 50], DEFAULT_B, 1);
      expect(p1).toBeGreaterThan(p0);
    });

    test('4. Prices always sum to ~1.0 (2 outcomes)', () => {
      const cases: [number, number][] = [
        [0, 0], [100, 0], [0, 100], [37, 82], [200, 50],
      ];
      for (const [q0, q1] of cases) {
        const sum = getPrice([q0, q1], DEFAULT_B, 0) + getPrice([q0, q1], DEFAULT_B, 1);
        expect(sum).toBeCloseTo(1.0, 10);
      }
    });

    test('5. Very large quantity difference → dominant price approaches 1.0', () => {
      const p0 = getPrice([1000, 0], DEFAULT_B, 0);
      expect(p0).toBeGreaterThan(0.99);
      expect(p0).toBeLessThanOrEqual(1.0);
    });

    test('6. Various b values produce valid prices (between 0 and 1)', () => {
      for (const b of [1, 10, 50, 100, 500, 1000]) {
        const p = getPrice([30, 20], b, 0);
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThan(1);
      }
    });
  });

  // ─── getPrices ────────────────────────────────────────────────

  describe('getPrices', () => {
    test('returns all prices at once (2 outcomes)', () => {
      const prices = getPrices([0, 0], DEFAULT_B);
      expect(prices).toHaveLength(2);
      expect(prices[0]).toBeCloseTo(0.5);
      expect(prices[1]).toBeCloseTo(0.5);
    });

    test('returns all prices at once (3 outcomes)', () => {
      const prices = getPrices([0, 0, 0], DEFAULT_B);
      expect(prices).toHaveLength(3);
      expect(prices[0]).toBeCloseTo(1 / 3);
      expect(prices[1]).toBeCloseTo(1 / 3);
      expect(prices[2]).toBeCloseTo(1 / 3);
    });

    test('prices sum to 1.0 for any quantities', () => {
      const prices = getPrices([30, 50, 10], DEFAULT_B);
      const sum = prices.reduce((a, p) => a + p, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    test('matches individual getPrice calls', () => {
      const q = [30, 50, 10];
      const prices = getPrices(q, DEFAULT_B);
      for (let i = 0; i < q.length; i++) {
        expect(prices[i]).toBeCloseTo(getPrice(q, DEFAULT_B, i), 10);
      }
    });
  });

  // ─── Cost function ─────────────────────────────────────────────

  describe('costFunction', () => {
    test('7. Equal quantities (2 outcomes) matches b * ln(2)', () => {
      expect(costFunction([0, 0], DEFAULT_B)).toBeCloseTo(DEFAULT_B * Math.log(2));
    });

    test('Equal quantities (3 outcomes) matches b * ln(3)', () => {
      expect(costFunction([0, 0, 0], DEFAULT_B)).toBeCloseTo(DEFAULT_B * Math.log(3));
    });

    test('8. Buying shares always has positive cost', () => {
      const cost = getCost([0, 0], DEFAULT_B, 0, 10);
      expect(cost).toBeGreaterThan(0);
    });

    test('9. Buying more shares costs more (monotonically increasing)', () => {
      const cost5 = getCost([0, 0], DEFAULT_B, 0, 5);
      const cost10 = getCost([0, 0], DEFAULT_B, 0, 10);
      const cost50 = getCost([0, 0], DEFAULT_B, 0, 50);
      expect(cost10).toBeGreaterThan(cost5);
      expect(cost50).toBeGreaterThan(cost10);
    });

    test('10. Buying outcome-0 shares is cheaper when outcome-0 has fewer outstanding shares', () => {
      const costLow = getCost([0, 50], DEFAULT_B, 0, 10);
      const costHigh = getCost([50, 0], DEFAULT_B, 0, 10);
      expect(costLow).toBeLessThan(costHigh);
    });
  });

  // ─── getCost ───────────────────────────────────────────────────

  describe('getCost', () => {
    test('11. Cost to buy 1 share at equal odds ≈ price * 1', () => {
      const price = getPrice([0, 0], DEFAULT_B, 0);
      const cost = getCost([0, 0], DEFAULT_B, 0, 1);
      expect(cost).toBeCloseTo(price * 1, 1);
    });

    test('12. Cost increases as you buy more of the same outcome', () => {
      const cost1 = getCost([0, 0], DEFAULT_B, 0, 10);
      const cost2 = getCost([10, 0], DEFAULT_B, 0, 10);
      expect(cost2).toBeGreaterThan(cost1);
    });

    test('13. Small purchase (~0 shares) costs ~0', () => {
      const cost = getCost([0, 0], DEFAULT_B, 0, 0.0001);
      expect(cost).toBeCloseTo(0, 3);
    });

    test('14. Cost matches manual calculation for known inputs', () => {
      const expected = costFunction([10, 0], DEFAULT_B) - costFunction([0, 0], DEFAULT_B);
      const actual = getCost([0, 0], DEFAULT_B, 0, 10);
      expect(actual).toBeCloseTo(expected, 10);
    });

    test('3-outcome cost is positive', () => {
      const cost = getCost([0, 0, 0], DEFAULT_B, 1, 10);
      expect(cost).toBeGreaterThan(0);
    });
  });

  // ─── getShares ─────────────────────────────────────────────────

  describe('getShares', () => {
    test('15. getShares inverts getCost: getShares(getCost(shares)) ≈ shares', () => {
      const shares = 25;
      const cost = getCost([10, 20], DEFAULT_B, 1, shares);
      const recovered = getShares([10, 20], DEFAULT_B, 1, cost);
      expect(recovered).toBeCloseTo(shares, 6);
    });

    test('16. Higher cost → more shares', () => {
      const shares5 = getShares([0, 0], DEFAULT_B, 0, 5);
      const shares20 = getShares([0, 0], DEFAULT_B, 0, 20);
      expect(shares20).toBeGreaterThan(shares5);
    });

    test('17. Shares for $0 cost = 0', () => {
      expect(getShares([0, 0], DEFAULT_B, 0, 0)).toBe(0);
    });

    test('18. At equal odds, small cost buys ~cost/price shares', () => {
      const price = getPrice([0, 0], DEFAULT_B, 0);
      const cost = 1;
      const shares = getShares([0, 0], DEFAULT_B, 0, cost);
      expect(shares).toBeCloseTo(cost / price, 0);
    });

    test('3-outcome getShares inverts getCost', () => {
      const shares = 15;
      const cost = getCost([10, 20, 5], DEFAULT_B, 2, shares);
      const recovered = getShares([10, 20, 5], DEFAULT_B, 2, cost);
      expect(recovered).toBeCloseTo(shares, 6);
    });
  });

  // ─── getNewQuantities ──────────────────────────────────────────

  describe('getNewQuantities', () => {
    test('19. Buying outcome-0 shares increases q[0], leaves others unchanged', () => {
      const result = getNewQuantities([10, 20], 0, 5);
      expect(result).toEqual([15, 20]);
    });

    test('20. Buying outcome-1 shares increases q[1], leaves others unchanged', () => {
      const result = getNewQuantities([10, 20], 1, 5);
      expect(result).toEqual([10, 25]);
    });

    test('21. Quantity increase equals shares purchased', () => {
      const shares = 42;
      const result = getNewQuantities([0, 0], 0, shares);
      expect(result[0]).toBe(shares);
    });

    test('3-outcome: only the target index changes', () => {
      const result = getNewQuantities([10, 20, 30], 1, 5);
      expect(result).toEqual([10, 25, 30]);
    });
  });

  // ─── Sensitivity to b parameter ───────────────────────────────

  describe('b parameter sensitivity', () => {
    test('22. Larger b → less price movement per share bought', () => {
      const shares = 20;
      const qAfter = getNewQuantities([0, 0], 0, shares);
      const priceAfterSmallB = getPrice(qAfter, 10, 0);
      const priceAfterLargeB = getPrice(qAfter, 1000, 0);
      const movementSmallB = Math.abs(priceAfterSmallB - 0.5);
      const movementLargeB = Math.abs(priceAfterLargeB - 0.5);
      expect(movementSmallB).toBeGreaterThan(movementLargeB);
    });

    test('23. Smaller b → more price movement per share bought', () => {
      const shares = 10;
      const priceSmallB = getPrice(getNewQuantities([0, 0], 0, shares), 10, 0);
      const priceLargeB = getPrice(getNewQuantities([0, 0], 0, shares), 1000, 0);
      expect(priceSmallB).toBeGreaterThan(priceLargeB);
    });
  });

  // ─── 3-outcome specific tests ──────────────────────────────────

  describe('3-outcome markets', () => {
    test('Equal quantities → all prices = 1/3', () => {
      const prices = getPrices([0, 0, 0], DEFAULT_B);
      for (const p of prices) {
        expect(p).toBeCloseTo(1 / 3, 10);
      }
    });

    test('Prices sum to 1.0 after buying shares', () => {
      const q = getNewQuantities([0, 0, 0], 0, 50);
      const q2 = getNewQuantities(q, 2, 30);
      const prices = getPrices(q2, DEFAULT_B);
      const sum = prices.reduce((a, p) => a + p, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    test('Dominant outcome has highest price', () => {
      const prices = getPrices([100, 20, 10], DEFAULT_B);
      expect(prices[0]).toBeGreaterThan(prices[1]);
      expect(prices[1]).toBeGreaterThan(prices[2]);
    });

    test('Cost is symmetric for equally-priced outcomes', () => {
      const cost0 = getCost([0, 0, 0], DEFAULT_B, 0, 10);
      const cost1 = getCost([0, 0, 0], DEFAULT_B, 1, 10);
      const cost2 = getCost([0, 0, 0], DEFAULT_B, 2, 10);
      expect(cost0).toBeCloseTo(cost1, 10);
      expect(cost1).toBeCloseTo(cost2, 10);
    });

    test('4-outcome market: equal prices = 0.25', () => {
      const prices = getPrices([0, 0, 0, 0], DEFAULT_B);
      expect(prices).toHaveLength(4);
      for (const p of prices) {
        expect(p).toBeCloseTo(0.25, 10);
      }
    });
  });
});
