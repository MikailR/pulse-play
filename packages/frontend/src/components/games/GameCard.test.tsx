import { render, screen } from '@testing-library/react';
import { GameCard } from './GameCard';
import type { Game } from '@/lib/types';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

const baseGame: Game = {
  id: 'game-1',
  sportId: 'baseball',
  homeTeam: 'Yankees',
  awayTeam: 'Red Sox',
  status: 'ACTIVE',
  startedAt: Date.now(),
  completedAt: null,
  metadata: null,
  createdAt: Date.now(),
};

describe('GameCard', () => {
  it('renders game matchup', () => {
    render(<GameCard game={baseGame} />);

    expect(screen.getByTestId('game-matchup')).toHaveTextContent('Yankees vs Red Sox');
  });

  it('renders sport badge', () => {
    render(<GameCard game={baseGame} />);

    expect(screen.getByTestId('game-sport-badge')).toHaveTextContent('baseball');
  });

  it('renders status badge', () => {
    render(<GameCard game={baseGame} />);

    expect(screen.getByTestId('game-status-badge')).toHaveTextContent('ACTIVE');
  });

  it('links to game detail page', () => {
    render(<GameCard game={baseGame} />);

    const link = screen.getByTestId('game-card-game-1');
    expect(link).toHaveAttribute('href', '/game/game-1');
  });

  it('shows market count when provided', () => {
    render(<GameCard game={baseGame} marketCount={3} />);

    expect(screen.getByTestId('game-market-count')).toHaveTextContent('3 markets');
  });

  it('shows singular market text for 1 market', () => {
    render(<GameCard game={baseGame} marketCount={1} />);

    expect(screen.getByTestId('game-market-count')).toHaveTextContent('1 market');
  });

  it('shows "No markets" when count is 0', () => {
    render(<GameCard game={baseGame} marketCount={0} />);

    expect(screen.getByTestId('game-market-count')).toHaveTextContent('No markets');
  });

  it('renders different sport colors', () => {
    const basketballGame = { ...baseGame, sportId: 'basketball' };
    render(<GameCard game={basketballGame} />);

    const badge = screen.getByTestId('game-sport-badge');
    expect(badge).toHaveClass('bg-orange-500/20');
  });

  it('renders SCHEDULED status style', () => {
    const scheduledGame = { ...baseGame, status: 'SCHEDULED' as const };
    render(<GameCard game={scheduledGame} />);

    const badge = screen.getByTestId('game-status-badge');
    expect(badge).toHaveClass('bg-gray-600/50');
  });

  it('renders COMPLETED status style', () => {
    const completedGame = { ...baseGame, status: 'COMPLETED' as const };
    render(<GameCard game={completedGame} />);

    const badge = screen.getByTestId('game-status-badge');
    expect(badge).toHaveClass('bg-blue-500/20');
  });
});
