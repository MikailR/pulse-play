/**
 * Live integration tests for ClearnodeClient.
 *
 * These tests hit the real Yellow Network sandbox and are SKIPPED by default.
 * Run with: LIVE_TEST=true pnpm --filter hub test
 *
 * Each test run uses an ephemeral wallet — no cleanup needed.
 */

import { ClearnodeClient } from "./client";
import { generatePrivateKey } from "viem/accounts";
import type { ClearnodeConfig } from "./types";

const describeLive = process.env.LIVE_TEST ? describe : describe.skip;

describeLive("ClearnodeClient (live sandbox)", () => {
  let client: ClearnodeClient;

  beforeAll(() => {
    const ephemeralKey = generatePrivateKey();

    const config: ClearnodeConfig = {
      url: "wss://clearnet-sandbox.yellow.com/ws",
      mmPrivateKey: ephemeralKey,
      application: "pulse-play",
      allowances: [{ asset: "ytest.usd", amount: "1000000000" }],
      faucetUrl: "https://clearnet-sandbox.yellow.com/faucet/requestTokens",
    };

    client = new ClearnodeClient(config);
  }, 30_000);

  afterAll(() => {
    client.disconnect();
  });

  // ── Auth + Connection ──

  it("can connect and authenticate with an ephemeral wallet against sandbox", async () => {
    await client.connect();
  }, 30_000);

  it("isConnected() returns true after successful connect", () => {
    expect(client.isConnected()).toBe(true);
  });

  // ── Faucet + Balance ──

  it('getBalance() before faucet returns "0" (fresh wallet)', async () => {
    const balance = await client.getBalance();
    expect(balance).toBe("0");
  }, 15_000);

  it("requestFaucet() succeeds", async () => {
    await expect(client.requestFaucet()).resolves.toBeUndefined();
  }, 15_000);

  it("getBalance() after faucet returns a non-zero amount", async () => {
    // Small delay for ledger to settle
    await new Promise((r) => setTimeout(r, 2000));
    const balance = await client.getBalance();
    expect(Number(balance)).toBeGreaterThan(0);
  }, 15_000);

  // ── Disconnect ──

  it("disconnect() cleanly closes the live WebSocket", () => {
    client.disconnect();
    expect(client.isConnected()).toBe(false);
  });
});
