import React from 'react';
import { Box, Text } from 'ink';
import type { GameSummary } from '../types.js';

interface GamesOverlayProps {
  games: GameSummary[];
  selectedIndex: number;
  height: number;
  currentGameId?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'gray',
  ACTIVE: 'green',
  COMPLETED: 'blue',
};

function truncateId(id: string, len = 36): string {
  return id.length > len ? id.slice(0, len - 2) + '..' : id;
}

export function GamesOverlay({ games, selectedIndex, height, currentGameId }: GamesOverlayProps) {
  const headerLines = 5; // title + separator + header + separator + footer hint
  const visibleCount = Math.max(height - headerLines, 3);

  // Auto-scroll to keep selection visible
  let scrollOffset = 0;
  if (selectedIndex >= visibleCount) {
    scrollOffset = selectedIndex - visibleCount + 1;
  }

  const displayGames = games.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={2}>
      <Box alignSelf="center">
        <Text bold color="cyan">GAMES ({games.length})</Text>
      </Box>
      <Box alignSelf="center">
        <Text color="gray">{'─'.repeat(86)}</Text>
      </Box>

      {/* Column headers */}
      <Box>
        <Text color="gray" bold>
          {'  '}
          {'ID'.padEnd(38)}
          {'SPORT'.padEnd(12)}
          {'HOME'.padEnd(14)}
          {'AWAY'.padEnd(14)}
          {'STATUS'}
        </Text>
      </Box>

      {games.length > 0 ? (
        displayGames.map((g, idx) => {
          const absoluteIndex = scrollOffset + idx;
          const isSelected = absoluteIndex === selectedIndex;
          const isCurrent = g.id === currentGameId;
          const homeName = g.homeTeam?.abbreviation ?? g.homeTeamId;
          const awayName = g.awayTeam?.abbreviation ?? g.awayTeamId;

          return (
            <Box key={g.id}>
              <Text color="cyan" bold>{isSelected ? '> ' : isCurrent ? '* ' : '  '}</Text>
              <Text color={isCurrent ? 'yellow' : 'white'} inverse={isSelected}>
                {truncateId(g.id).padEnd(38)}
              </Text>
              <Text color="gray" inverse={isSelected}>
                {g.sportId.padEnd(12)}
              </Text>
              <Text color="white" inverse={isSelected}>
                {homeName.padEnd(14)}
              </Text>
              <Text color="white" inverse={isSelected}>
                {awayName.padEnd(14)}
              </Text>
              <Text color={STATUS_COLORS[g.status] ?? 'white'} bold inverse={isSelected}>
                {g.status}
              </Text>
            </Box>
          );
        })
      ) : (
        <Box justifyContent="center" marginTop={1}>
          <Text color="gray" dimColor>No games found</Text>
        </Box>
      )}

      <Box alignSelf="center" marginTop={1}>
        <Text color="gray" dimColor>
          j/k: navigate  Enter: load game  Escape: dismiss
          {currentGameId ? `  Current: ${currentGameId.slice(0, 8)}..` : ''}
        </Text>
      </Box>
    </Box>
  );
}
