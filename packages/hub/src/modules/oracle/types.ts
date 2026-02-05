import type { Outcome } from '../lmsr/types.js';

export interface GameState {
  active: boolean;
}

export interface AutoPlayConfig {
  openDelayMs: number;
  closeDelayMs: number;
  resolveDelayMs: number;
  outcomes: Outcome[] | 'RANDOM';
}

export interface OracleCallbacks {
  onOpenMarket: () => void;
  onCloseMarket: () => void;
  onResolve: (outcome: Outcome) => void;
}
