import type { Outcome } from '../lmsr/types.js';

export interface Position {
  address: string;
  marketId: string;
  outcome: Outcome;
  shares: number;
  costPaid: number;
  appSessionId: string;
  timestamp: number;
}
