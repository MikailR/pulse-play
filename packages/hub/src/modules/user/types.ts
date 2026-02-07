export interface UserStats {
  address: string;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  totalWagered: number;
  totalPayout: number;
  netPnl: number;
  firstSeenAt: number;
  lastActiveAt: number;
}
