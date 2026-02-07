export type GameStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';

export interface Game {
  id: string;
  sportId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: GameStatus;
  startedAt: number | null;
  completedAt: number | null;
  imagePath: string | null;
  metadata: string | null;
  createdAt: number;
}
