import { EventEmitter } from "events";
import { sendAndWait } from "./rpc";

/** Minimal mock that satisfies the WebSocket interface used by sendAndWait. */
function createMockWs() {
  const emitter = new EventEmitter();
  const sent: string[] = [];

  return {
    addEventListener: (event: string, handler: (...args: any[]) => void) => {
      emitter.on(event, handler);
    },
    removeEventListener: (event: string, handler: (...args: any[]) => void) => {
      emitter.off(event, handler);
    },
    send: (msg: string) => {
      sent.push(msg);
    },
    /** Simulate the server sending a message back */
    simulateMessage: (data: string) => {
      emitter.emit("message", { data });
    },
    sent,
    emitter,
  };
}

describe("sendAndWait", () => {
  it("sends the message string over WebSocket", () => {
    const ws = createMockWs();
    // Fire and forget — we won't resolve this, just check send was called
    sendAndWait(ws as any, '{"req":[1,"test",{}]}', "test_response", 100).catch(
      () => {},
    );
    expect(ws.sent).toHaveLength(1);
    expect(ws.sent[0]).toBe('{"req":[1,"test",{}]}');
  });

  it("resolves with response when matching method is received", async () => {
    const ws = createMockWs();
    const promise = sendAndWait(ws as any, "request", "get_balance");

    const response = JSON.stringify({ res: [1, "get_balance", { amount: "100" }] });
    ws.simulateMessage(response);

    await expect(promise).resolves.toBe(response);
  });

  it("ignores messages with non-matching methods", async () => {
    const ws = createMockWs();
    const promise = sendAndWait(ws as any, "request", "get_balance");

    // Send unrelated message first
    ws.simulateMessage(JSON.stringify({ res: [1, "other_method", {}] }));
    // Then the correct one
    const response = JSON.stringify({ res: [1, "get_balance", { amount: "50" }] });
    ws.simulateMessage(response);

    await expect(promise).resolves.toBe(response);
  });

  it('rejects with error when method === "error" response is received', async () => {
    const ws = createMockWs();
    const promise = sendAndWait(ws as any, "request", "get_balance");

    ws.simulateMessage(
      JSON.stringify({ res: [1, "error", { code: 500, message: "Internal error" }] }),
    );

    await expect(promise).rejects.toThrow("RPC error");
  });

  it("rejects on timeout when no response arrives", async () => {
    const ws = createMockWs();
    const promise = sendAndWait(ws as any, "request", "get_balance", 50);

    await expect(promise).rejects.toThrow("Timed out waiting for 'get_balance'");
  });

  it("handles multiple concurrent sendAndWait calls with different methods", async () => {
    const ws = createMockWs();

    const p1 = sendAndWait(ws as any, "req1", "method_a");
    const p2 = sendAndWait(ws as any, "req2", "method_b");

    const responseB = JSON.stringify({ res: [2, "method_b", { data: "b" }] });
    const responseA = JSON.stringify({ res: [1, "method_a", { data: "a" }] });

    // Respond in reverse order
    ws.simulateMessage(responseB);
    ws.simulateMessage(responseA);

    await expect(p1).resolves.toBe(responseA);
    await expect(p2).resolves.toBe(responseB);
  });
});
