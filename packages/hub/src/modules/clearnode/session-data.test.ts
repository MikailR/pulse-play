import {
  encodeSessionData,
  decodeSessionData,
  type SessionDataV1,
  type SessionDataV2,
  type SessionDataV3,
} from './session-data';

describe('SessionData encode/decode', () => {
  test('round-trips V1 data', () => {
    const v1: SessionDataV1 = {
      v: 1,
      marketId: 'market-1',
      outcome: 'BALL',
      amount: 10,
      timestamp: 1700000000000,
    };
    const encoded = encodeSessionData(v1);
    const decoded = decodeSessionData(encoded);
    expect(decoded).toEqual(v1);
    expect(decoded.v).toBe(1);
  });

  test('round-trips V2 data', () => {
    const v2: SessionDataV2 = {
      v: 2,
      marketId: 'market-1',
      outcome: 'STRIKE',
      amount: 10,
      shares: 12.5,
      effectivePricePerShare: 0.8,
      preBetOdds: { ball: 0.5, strike: 0.5 },
      postBetOdds: { ball: 0.4, strike: 0.6 },
      timestamp: 1700000000000,
    };
    const encoded = encodeSessionData(v2);
    const decoded = decodeSessionData(encoded);
    expect(decoded).toEqual(v2);
    expect(decoded.v).toBe(2);
  });

  test('round-trips V3 data', () => {
    const v3: SessionDataV3 = {
      v: 3,
      resolution: 'BALL',
      result: 'WIN',
      payout: 12.5,
      profit: 2.5,
      shares: 12.5,
      costPaid: 10,
      timestamp: 1700000000000,
    };
    const encoded = encodeSessionData(v3);
    const decoded = decodeSessionData(encoded);
    expect(decoded).toEqual(v3);
    expect(decoded.v).toBe(3);
  });

  test('v field discriminates correctly between versions', () => {
    const v1: SessionDataV1 = { v: 1, marketId: 'm1', outcome: 'BALL', amount: 5, timestamp: 0 };
    const v2: SessionDataV2 = {
      v: 2, marketId: 'm1', outcome: 'BALL', amount: 5, shares: 6,
      effectivePricePerShare: 0.83, preBetOdds: { ball: 0.5, strike: 0.5 },
      postBetOdds: { ball: 0.6, strike: 0.4 }, timestamp: 0,
    };
    const v3: SessionDataV3 = {
      v: 3, resolution: 'BALL', result: 'LOSS', payout: 0, profit: -5,
      shares: 6, costPaid: 5, timestamp: 0,
    };

    const d1 = decodeSessionData(encodeSessionData(v1));
    const d2 = decodeSessionData(encodeSessionData(v2));
    const d3 = decodeSessionData(encodeSessionData(v3));

    expect(d1.v).toBe(1);
    expect(d2.v).toBe(2);
    expect(d3.v).toBe(3);
  });

  test('encodeSessionData returns a valid JSON string', () => {
    const data: SessionDataV1 = { v: 1, marketId: 'm1', outcome: 'BALL', amount: 10, timestamp: 0 };
    const encoded = encodeSessionData(data);
    expect(typeof encoded).toBe('string');
    expect(() => JSON.parse(encoded)).not.toThrow();
  });

  test('decodeSessionData throws on invalid JSON', () => {
    expect(() => decodeSessionData('not-json')).toThrow();
  });
});
