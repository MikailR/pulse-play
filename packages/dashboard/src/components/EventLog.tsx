import React from 'react';
import { Box, Text } from 'ink';
import type { EventLogEntry } from '../types.js';
import { formatTime } from '../utils/formatters.js';

interface EventLogProps {
  events: EventLogEntry[];
  maxDisplay?: number;
}

function getEventTypeColor(type: string): string {
  switch (type) {
    case 'ODDS_UPDATE':
      return 'cyan';
    case 'MARKET_STATUS':
      return 'yellow';
    case 'GAME_STATE':
      return 'green';
    case 'BET_RESULT':
      return 'magenta';
    default:
      return 'white';
  }
}

export function EventLog({ events, maxDisplay = 8 }: EventLogProps) {
  // Show most recent events first, limit to maxDisplay
  const displayEvents = events.slice(-maxDisplay).reverse();

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Box justifyContent="center">
        <Text bold color="white">
          EVENT LOG
        </Text>
      </Box>

      {displayEvents.length > 0 ? (
        displayEvents.map((event, idx) => (
          <Box key={`${event.timestamp.getTime()}-${idx}`} gap={1}>
            <Text color="gray">{formatTime(event.timestamp)}</Text>
            <Text color={getEventTypeColor(event.type)}>[{event.type}]</Text>
            <Text>{event.message}</Text>
          </Box>
        ))
      ) : (
        <Box>
          <Text color="gray" dimColor>
            Waiting for events...
          </Text>
        </Box>
      )}
    </Box>
  );
}
