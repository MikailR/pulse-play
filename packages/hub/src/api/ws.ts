import type WebSocket from 'ws';
import type { WsMessage } from './types.js';

export class WsManager {
  private connections: Map<WebSocket, string | null> = new Map();
  private addressMap: Map<string, Set<WebSocket>> = new Map();

  addConnection(ws: WebSocket, address?: string): void {
    this.connections.set(ws, address ?? null);

    if (address) {
      let sockets = this.addressMap.get(address);
      if (!sockets) {
        sockets = new Set();
        this.addressMap.set(address, sockets);
      }
      sockets.add(ws);
    }

    ws.on('close', () => this.removeConnection(ws));
  }

  removeConnection(ws: WebSocket): void {
    const address = this.connections.get(ws);
    this.connections.delete(ws);

    if (address) {
      const sockets = this.addressMap.get(address);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          this.addressMap.delete(address);
        }
      }
    }
  }

  broadcast(msg: WsMessage): void {
    const data = JSON.stringify(msg);
    for (const [ws] of this.connections) {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(data);
      }
    }
  }

  sendTo(address: string, msg: WsMessage): void {
    const sockets = this.addressMap.get(address);
    if (!sockets) return;

    const data = JSON.stringify(msg);
    for (const ws of sockets) {
      if (ws.readyState === 1) {
        ws.send(data);
      }
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  clear(): void {
    this.connections.clear();
    this.addressMap.clear();
  }
}
