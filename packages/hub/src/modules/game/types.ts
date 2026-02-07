export type GameStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';

export interface Game {
  id: string;
  sportId: string;
  homeTeam: string;
  awayTeam: string;
  status: GameStatus;
  startedAt: number | null;
  completedAt: number | null;
  metadata: string | null;
  createdAt: number;
}
