import React from 'react';
import { Box, Text } from 'ink';
import type { MarketSummary } from '../types.js';
import { getStatusColor } from '../utils/formatters.js';

interface MarketsOverlayProps {
  markets: MarketSummary[];
  selectedIndex: number;
  height: number;
}

export function MarketsOverlay({ markets, selectedIndex, height }: MarketsOverlayProps) {
  const headerLines = 5; // title + separator + header + separator + footer hint
  const visibleCount = Math.max(height - headerLines, 3);

  // Auto-scroll to keep selection visible
  let scrollOffset = 0;
  if (selectedIndex >= visibleCount) {
    scrollOffset = selectedIndex - visibleCount + 1;
  }

  const displayMarkets = markets.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={2}>
      <Box alignSelf="center">
        <Text bold color="cyan">MARKETS ({markets.length})</Text>
      </Box>
      <Box alignSelf="center">
        <Text color="gray">{'─'.repeat(60)}</Text>
      </Box>

      {/* Column headers */}
      <Box>
        <Text color="gray" bold>
          {'  '}
          {'ID'.padEnd(28)}
          {'GAME'.padEnd(16)}
          {'CATEGORY'.padEnd(12)}
          {'STATUS'.padEnd(10)}
          {'OUTCOME'}
        </Text>
      </Box>

      {markets.length > 0 ? (
        displayMarkets.map((m, idx) => {
          const absoluteIndex = scrollOffset + idx;
          const isSelected = absoluteIndex === selectedIndex;
          return (
            <Box key={m.id}>
              <Text color="cyan" bold>{isSelected ? '> ' : '  '}</Text>
              <Text color="white" inverse={isSelected}>
                {m.id.padEnd(28)}
              </Text>
              <Text color="gray" inverse={isSelected}>
                {m.gameId.slice(0, 14).padEnd(16)}
              </Text>
              <Text color="gray" inverse={isSelected}>
                {m.categoryId.padEnd(12)}
              </Text>
              <Text color={getStatusColor(m.status)} bold inverse={isSelected}>
                {m.status.padEnd(10)}
              </Text>
              <Text color="yellow" inverse={isSelected}>
                {m.outcome ?? '-'}
              </Text>
            </Box>
          );
        })
      ) : (
        <Box justifyContent="center" marginTop={1}>
          <Text color="gray" dimColor>No markets found</Text>
        </Box>
      )}

      <Box alignSelf="center" marginTop={1}>
        <Text color="gray" dimColor>
          j/k: navigate  Enter: load market  Escape: dismiss
        </Text>
      </Box>
    </Box>
  );
}
