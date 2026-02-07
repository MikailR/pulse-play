import { render, screen } from '@testing-library/react';
import { GameHeader } from './GameHeader';
import type { Game } from '@/lib/types';

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

const baseGame: Game = {
  id: 'game-1',
  sportId: 'baseball',
  homeTeamId: 'nyy',
  awayTeamId: 'bos',
  homeTeam: { id: 'nyy', sportId: 'baseball', name: 'Yankees', abbreviation: 'NYY', logoPath: null, createdAt: 1000 },
  awayTeam: { id: 'bos', sportId: 'baseball', name: 'Red Sox', abbreviation: 'BOS', logoPath: null, createdAt: 1000 },
  status: 'ACTIVE',
  startedAt: Date.now(),
  completedAt: null,
  imagePath: null,
  metadata: null,
  createdAt: Date.now(),
};

describe('GameHeader', () => {
  it('renders matchup', () => {
    render(<GameHeader game={baseGame} />);

    expect(screen.getByTestId('game-header-matchup')).toHaveTextContent('Yankees vs Red Sox');
  });

  it('renders sport badge', () => {
    render(<GameHeader game={baseGame} />);

    expect(screen.getByTestId('game-header-sport')).toHaveTextContent('baseball');
  });

  it('renders status badge', () => {
    render(<GameHeader game={baseGame} />);

    expect(screen.getByTestId('game-header-status')).toHaveTextContent('ACTIVE');
  });

  it('renders back link to games list', () => {
    render(<GameHeader game={baseGame} />);

    const backLink = screen.getByTestId('back-link');
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('renders SCHEDULED status style', () => {
    const scheduledGame = { ...baseGame, status: 'SCHEDULED' as const };
    render(<GameHeader game={scheduledGame} />);

    expect(screen.getByTestId('game-header-status')).toHaveClass('bg-gray-600/50');
  });

  it('renders COMPLETED status style', () => {
    const completedGame = { ...baseGame, status: 'COMPLETED' as const };
    render(<GameHeader game={completedGame} />);

    expect(screen.getByTestId('game-header-status')).toHaveClass('bg-blue-500/20');
  });
});
