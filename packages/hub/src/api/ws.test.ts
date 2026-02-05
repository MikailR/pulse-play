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

    manager.broadcast({ type: 'GAME_STATE', active: true });

    expect(wsOpen.send).toHaveBeenCalled();
    expect(wsClosed.send).not.toHaveBeenCalled();
  });

  test('sendTo delivers message only to sockets registered with that address', () => {
    const ws1 = createMockSocket();
    const ws2 = createMockSocket();
    manager.addConnection(ws1, '0xAlice');
    manager.addConnection(ws2, '0xBob');

    const msg = { type: 'BET_RESULT' as const, result: 'WIN' as const, marketId: 'm1', payout: 10 };
    manager.sendTo('0xAlice', msg);

    expect(ws1.send).toHaveBeenCalledWith(JSON.stringify(msg));
    expect(ws2.send).not.toHaveBeenCalled();
  });

  test('sendTo does nothing for unknown address', () => {
    const ws = createMockSocket();
    manager.addConnection(ws, '0xAlice');

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

    const msg = { type: 'BET_RESULT' as const, result: 'WIN' as const, marketId: 'm1', payout: 5 };
    manager.sendTo('0xAlice', msg);

    expect(ws1.send).toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalled();
  });

  test('clear removes all connections', () => {
    const ws1 = createMockSocket();
    const ws2 = createMockSocket();
    manager.addConnection(ws1, '0xAlice');
    manager.addConnection(ws2, '0xBob');

    manager.clear();
    expect(manager.getConnectionCount()).toBe(0);

    // sendTo should not deliver after clear
    manager.sendTo('0xAlice', { type: 'GAME_STATE', active: true });
    expect(ws1.send).not.toHaveBeenCalled();
  });
});
