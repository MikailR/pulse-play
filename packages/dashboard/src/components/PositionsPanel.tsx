import React from 'react';
import { Box, Text } from 'ink';
import type { Position } from '../types.js';
import {
  truncateAddress,
  formatShares,
  formatDollars,
  getOutcomeColor,
} from '../utils/formatters.js';

interface PositionsPanelProps {
  positions: Position[];
}

const MAX_DISPLAY_POSITIONS = 5;

export function PositionsPanel({ positions }: PositionsPanelProps) {
  const displayPositions = positions.slice(0, MAX_DISPLAY_POSITIONS);
  const remainingCount = positions.length - MAX_DISPLAY_POSITIONS;

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Box justifyContent="center">
        <Text bold color="white">
          POSITIONS ({positions.length})
        </Text>
      </Box>

      {displayPositions.length > 0 ? (
        <>
          {displayPositions.map((pos, idx) => (
            <Box key={`${pos.address}-${pos.timestamp}-${idx}`} gap={1}>
              <Text color="gray">{truncateAddress(pos.address)}</Text>
              <Text color={getOutcomeColor(pos.outcome)} bold>
                {pos.outcome.padEnd(6)}
              </Text>
              <Text>{formatShares(pos.shares).padStart(6)}</Text>
              <Text color="green">{formatDollars(pos.costPaid)}</Text>
            </Box>
          ))}
          {remainingCount > 0 && (
            <Box>
              <Text color="gray" dimColor>
                +{remainingCount} more...
              </Text>
            </Box>
          )}
        </>
      ) : (
        <Box>
          <Text color="gray" dimColor>
            No positions
          </Text>
        </Box>
      )}
    </Box>
  );
}
