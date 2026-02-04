import { costFunction, getPrice, getCost, getShares, getNewQuantities } from './engine';

const DEFAULT_B = 100;

describe('LMSR Engine', () => {
  // ─── Price calculation ─────────────────────────────────────────

  describe('getPrice', () => {
    test('1. Equal quantities → both prices = 0.5', () => {
      expect(getPrice(0, 0, DEFAULT_B, 'BALL')).toBeCloseTo(0.5);
      expect(getPrice(0, 0, DEFAULT_B, 'STRIKE')).toBeCloseTo(0.5);
    });

    test('2. Higher q_ball → Ball price > Strike price', () => {
      const pBall = getPrice(50, 0, DEFAULT_B, 'BALL');
      const pStrike = getPrice(50, 0, DEFAULT_B, 'STRIKE');
      expect(pBall).toBeGreaterThan(pStrike);
    });

    test('3. Higher q_strike → Strike price > Ball price', () => {
      const pBall = getPrice(0, 50, DEFAULT_B, 'BALL');
      const pStrike = getPrice(0, 50, DEFAULT_B, 'STRIKE');
      expect(pStrike).toBeGreaterThan(pBall);
    });

    test('4. Prices always sum to ~1.0', () => {
      const cases: [number, number][] = [
        [0, 0], [100, 0], [0, 100], [37, 82], [200, 50],
      ];
      for (const [qB, qS] of cases) {
        const sum = getPrice(qB, qS, DEFAULT_B, 'BALL') + getPrice(qB, qS, DEFAULT_B, 'STRIKE');
        expect(sum).toBeCloseTo(1.0, 10);
      }
    });

    test('5. Very large quantity difference → dominant price approaches 1.0', () => {
      const pBall = getPrice(1000, 0, DEFAULT_B, 'BALL');
      expect(pBall).toBeGreaterThan(0.99);
      expect(pBall).toBeLessThanOrEqual(1.0);
    });

    test('6. Various b values produce valid prices (between 0 and 1)', () => {
      for (const b of [1, 10, 50, 100, 500, 1000]) {
        const p = getPrice(30, 20, b, 'BALL');
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThan(1);
      }
    });
  });

  // ─── Cost function ─────────────────────────────────────────────

  describe('costFunction', () => {
    test('7. Equal quantities matches b * ln(2)', () => {
      expect(costFunction(0, 0, DEFAULT_B)).toBeCloseTo(DEFAULT_B * Math.log(2));
    });

    test('8. Buying shares always has positive cost', () => {
      const cost = getCost(0, 0, DEFAULT_B, 'BALL', 10);
      expect(cost).toBeGreaterThan(0);
    });

    test('9. Buying more shares costs more (monotonically increasing)', () => {
      const cost5 = getCost(0, 0, DEFAULT_B, 'BALL', 5);
      const cost10 = getCost(0, 0, DEFAULT_B, 'BALL', 10);
      const cost50 = getCost(0, 0, DEFAULT_B, 'BALL', 50);
      expect(cost10).toBeGreaterThan(cost5);
      expect(cost50).toBeGreaterThan(cost10);
    });

    test('10. Buying Ball shares is cheaper when Ball has fewer outstanding shares', () => {
      const costLow = getCost(0, 50, DEFAULT_B, 'BALL', 10);
      const costHigh = getCost(50, 0, DEFAULT_B, 'BALL', 10);
      expect(costLow).toBeLessThan(costHigh);
    });
  });

  // ─── getCost ───────────────────────────────────────────────────

  describe('getCost', () => {
    test('11. Cost to buy 1 share at equal odds ≈ price * 1', () => {
      const price = getPrice(0, 0, DEFAULT_B, 'BALL');
      const cost = getCost(0, 0, DEFAULT_B, 'BALL', 1);
      // For small purchases, cost ≈ price * shares
      expect(cost).toBeCloseTo(price * 1, 1);
    });

    test('12. Cost increases as you buy more of the same outcome', () => {
      // First 10 shares
      const cost1 = getCost(0, 0, DEFAULT_B, 'BALL', 10);
      // Next 10 shares (after 10 already purchased)
      const cost2 = getCost(10, 0, DEFAULT_B, 'BALL', 10);
      expect(cost2).toBeGreaterThan(cost1);
    });

    test('13. Small purchase (~0 shares) costs ~0', () => {
      const cost = getCost(0, 0, DEFAULT_B, 'BALL', 0.0001);
      expect(cost).toBeCloseTo(0, 3);
    });

    test('14. Cost matches manual calculation for known inputs', () => {
      // C(10, 0, 100) - C(0, 0, 100)
      const expected = costFunction(10, 0, DEFAULT_B) - costFunction(0, 0, DEFAULT_B);
      const actual = getCost(0, 0, DEFAULT_B, 'BALL', 10);
      expect(actual).toBeCloseTo(expected, 10);
    });
  });

  // ─── getShares ─────────────────────────────────────────────────

  describe('getShares', () => {
    test('15. getShares inverts getCost: getShares(getCost(shares)) ≈ shares', () => {
      const shares = 25;
      const cost = getCost(10, 20, DEFAULT_B, 'STRIKE', shares);
      const recovered = getShares(10, 20, DEFAULT_B, 'STRIKE', cost);
      expect(recovered).toBeCloseTo(shares, 6);
    });

    test('16. Higher cost → more shares', () => {
      const shares5 = getShares(0, 0, DEFAULT_B, 'BALL', 5);
      const shares20 = getShares(0, 0, DEFAULT_B, 'BALL', 20);
      expect(shares20).toBeGreaterThan(shares5);
    });

    test('17. Shares for $0 cost = 0', () => {
      expect(getShares(0, 0, DEFAULT_B, 'BALL', 0)).toBe(0);
    });

    test('18. At equal odds, small cost buys ~cost/price shares', () => {
      const price = getPrice(0, 0, DEFAULT_B, 'BALL');
      const cost = 1;
      const shares = getShares(0, 0, DEFAULT_B, 'BALL', cost);
      // For small cost relative to b, shares ≈ cost / price
      expect(shares).toBeCloseTo(cost / price, 0);
    });
  });

  // ─── getNewQuantities ──────────────────────────────────────────

  describe('getNewQuantities', () => {
    test('19. Buying Ball shares increases qBall, leaves qStrike unchanged', () => {
      const { qBall, qStrike } = getNewQuantities(10, 20, 'BALL', 5);
      expect(qBall).toBe(15);
      expect(qStrike).toBe(20);
    });

    test('20. Buying Strike shares increases qStrike, leaves qBall unchanged', () => {
      const { qBall, qStrike } = getNewQuantities(10, 20, 'STRIKE', 5);
      expect(qBall).toBe(10);
      expect(qStrike).toBe(25);
    });

    test('21. Quantity increase equals shares purchased', () => {
      const shares = 42;
      const { qBall } = getNewQuantities(0, 0, 'BALL', shares);
      expect(qBall).toBe(shares);
    });
  });

  // ─── Sensitivity to b parameter ───────────────────────────────

  describe('b parameter sensitivity', () => {
    test('22. Larger b → less price movement per share bought', () => {
      const shares = 20;
      const priceAfterSmallB = getPrice(
        ...Object.values(getNewQuantities(0, 0, 'BALL', shares)) as [number, number],
        10, 'BALL',
      );
      const priceAfterLargeB = getPrice(
        ...Object.values(getNewQuantities(0, 0, 'BALL', shares)) as [number, number],
        1000, 'BALL',
      );
      // Starting price is 0.5 for both. After buying, small b should move price more.
      const movementSmallB = Math.abs(priceAfterSmallB - 0.5);
      const movementLargeB = Math.abs(priceAfterLargeB - 0.5);
      expect(movementSmallB).toBeGreaterThan(movementLargeB);
    });

    test('23. Smaller b → more price movement per share bought', () => {
      const shares = 10;
      const costSmallB = getCost(0, 0, 10, 'BALL', shares);
      const costLargeB = getCost(0, 0, 1000, 'BALL', shares);
      // With small b, buying is more expensive (price moves faster)
      // At equal odds the marginal cost is 0.5 for both, but total cost diverges
      // because small b makes later shares much more expensive
      const priceSmallB = getPrice(shares, 0, 10, 'BALL');
      const priceLargeB = getPrice(shares, 0, 1000, 'BALL');
      expect(priceSmallB).toBeGreaterThan(priceLargeB);
    });
  });
});
