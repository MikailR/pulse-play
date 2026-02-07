import type { Position, SessionStatus } from './types.js';

export class PositionTracker {
  private positions: Position[] = [];

  addPosition(position: Position): void {
    this.positions.push(position);
  }

  updateSessionStatus(appSessionId: string, status: SessionStatus): void {
    const position = this.positions.find((p) => p.appSessionId === appSessionId);
    if (position) {
      position.sessionStatus = status;
    }
  }

  updateAppSessionVersion(appSessionId: string, version: number): void {
    const position = this.positions.find((p) => p.appSessionId === appSessionId);
    if (position) {
      position.appSessionVersion = version;
    }
  }

  getPositionsByMarket(marketId: string): Position[] {
    return this.positions.filter((p) => p.marketId === marketId);
  }

  getPositionsByUser(address: string): Position[] {
    return this.positions.filter((p) => p.address === address);
  }

  getPosition(address: string, marketId: string): Position | null {
    return (
      this.positions.find(
        (p) => p.address === address && p.marketId === marketId,
      ) ?? null
    );
  }

  clearPositions(marketId: string): void {
    this.positions = this.positions.filter((p) => p.marketId !== marketId);
  }
}
