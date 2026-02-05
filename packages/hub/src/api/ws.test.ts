import { WsManager } from './ws.js';
import { EventEmitter } from 'events';
import type WebSocket from 'ws';

function createMockSocket(readyState = 1): WebSocket {
  const emitter = new EventEmitter();
  return {
    readyState,
    send: jest.fn(),
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter),
  } as unknown as WebSocket;
}

describe('WsManager', () => {
  let manager: WsManager;

  beforeEach(() => {
    manager = new WsManager();
  });

  test('broadcast sends message to all connected sockets', () => {
    const ws1 = createMockSocket();
    const ws2 = createMockSocket();
    manager.addConnection(ws1);
    manager.addConnection(ws2);

    // Clear calls from CONNECTION_COUNT broadcasts during addConnection
    (ws1.send as jest.Mock).mockClear();
    (ws2.send as jest.Mock).mockClear();

    const msg = { type: 'GAME_STATE' as const, active: true };
    manager.broadcast(msg);

    expect(ws1.send).toHaveBeenCalledWith(JSON.stringify(msg));
    expect(ws2.send).toHaveBeenCalledWith(JSON.stringify(msg));
  });

  test('broadcast skips sockets that are not OPEN', () => {
    const wsOpen = createMockSocket(1);
    const wsClosed = createMockSocket(3);
    manager.addConnection(wsOpen);
    manager.addConnection(wsClosed);

    // Clear CONNECTION_COUNT broadcasts
    (wsOpen.send as jest.Mock).mockClear();
    (wsClosed.send as jest.Mock).mockClear();

    manager.broadcast({ type: 'GAME_STATE', active: true });

    expect(wsOpen.send).toHaveBeenCalled();
    expect(wsClosed.send).not.toHaveBeenCalled();
  });

  test('sendTo delivers message only to sockets registered with that address', () => {
    const ws1 = createMockSocket();
    const ws2 = createMockSocket();
    manager.addConnection(ws1, '0xAlice');
    manager.addConnection(ws2, '0xBob');

    // Clear CONNECTION_COUNT broadcasts
    (ws1.send as jest.Mock).mockClear();
    (ws2.send as jest.Mock).mockClear();

    const msg = { type: 'BET_RESULT' as const, result: 'WIN' as const, marketId: 'm1', payout: 10 };
    manager.sendTo('0xAlice', msg);

    expect(ws1.send).toHaveBeenCalledWith(JSON.stringify(msg));
    expect(ws2.send).not.toHaveBeenCalled();
  });

  test('sendTo does nothing for unknown address', () => {
    const ws = createMockSocket();
    manager.addConnection(ws, '0xAlice');

    // Clear CONNECTION_COUNT broadcasts
    (ws.send as jest.Mock).mockClear();

    manager.sendTo('0xUnknown', { type: 'GAME_STATE', active: true });
    expect(ws.send).not.toHaveBeenCalled();
  });

  test('connection removed on socket close event', () => {
    const ws = createMockSocket();
    manager.addConnection(ws, '0xAlice');
    expect(manager.getConnectionCount()).toBe(1);

    (ws as any).emit('close');
    expect(manager.getConnectionCount()).toBe(0);
  });

  test('getConnectionCount returns correct count', () => {
    expect(manager.getConnectionCount()).toBe(0);
    const ws1 = createMockSocket();
    const ws2 = createMockSocket();
    manager.addConnection(ws1);
    manager.addConnection(ws2);
    expect(manager.getConnectionCount()).toBe(2);
  });

  test('multiple sockets per address all receive sendTo', () => {
    const ws1 = createMockSocket();
    const ws2 = createMockSocket();
    manager.addConnection(ws1, '0xAlice');
    manager.addConnection(ws2, '0xAlice');

    // Clear CONNECTION_COUNT broadcasts
    (ws1.send as jest.Mock).mockClear();
    (ws2.send as jest.Mock).mockClear();

    const msg = { type: 'BET_RESULT' as const, result: 'WIN' as const, marketId: 'm1', payout: 5 };
    manager.sendTo('0xAlice', msg);

    expect(ws1.send).toHaveBeenCalledWith(JSON.stringify(msg));
    expect(ws2.send).toHaveBeenCalledWith(JSON.stringify(msg));
  });

  test('clear removes all connections', () => {
    const ws1 = createMockSocket();
    const ws2 = createMockSocket();
    manager.addConnection(ws1, '0xAlice');
    manager.addConnection(ws2, '0xBob');

    // Clear CONNECTION_COUNT broadcasts
    (ws1.send as jest.Mock).mockClear();
    (ws2.send as jest.Mock).mockClear();

    manager.clear();
    expect(manager.getConnectionCount()).toBe(0);

    // sendTo should not deliver after clear
    manager.sendTo('0xAlice', { type: 'GAME_STATE', active: true });
    expect(ws1.send).not.toHaveBeenCalled();
  });

  test('broadcasts CONNECTION_COUNT on addConnection', () => {
    const ws1 = createMockSocket();
    manager.addConnection(ws1);

    expect(ws1.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'CONNECTION_COUNT', count: 1 })
    );

    const ws2 = createMockSocket();
    manager.addConnection(ws2);

    // Both sockets should receive the count update
    expect(ws1.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'CONNECTION_COUNT', count: 2 })
    );
    expect(ws2.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'CONNECTION_COUNT', count: 2 })
    );
  });

  test('broadcasts CONNECTION_COUNT on removeConnection', () => {
    const ws1 = createMockSocket();
    const ws2 = createMockSocket();
    manager.addConnection(ws1);
    manager.addConnection(ws2);

    (ws1.send as jest.Mock).mockClear();
    (ws2.send as jest.Mock).mockClear();

    // Simulate ws1 close
    (ws1 as any).emit('close');

    // ws2 should receive the updated count
    expect(ws2.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'CONNECTION_COUNT', count: 1 })
    );
  });

  test('sendToSocket sends to specific socket', () => {
    const ws = createMockSocket();
    manager.addConnection(ws);

    (ws.send as jest.Mock).mockClear();

    const msg = { type: 'STATE_SYNC' as const, state: {} as any, positions: [] };
    manager.sendToSocket(ws, msg);

    expect(ws.send).toHaveBeenCalledWith(JSON.stringify(msg));
  });
});
