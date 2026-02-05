import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { useWebSocket } from './hooks/useWebSocket.js';
import { useAdminState } from './hooks/useAdminState.js';
import { MarketPanel } from './components/MarketPanel.js';
import { PositionsPanel } from './components/PositionsPanel.js';
import { EventLog } from './components/EventLog.js';
import { SystemInfo } from './components/SystemInfo.js';
import { formatWsMessage } from './utils/formatters.js';
import type { EventLogEntry, WsMessage } from './types.js';

interface AppProps {
  wsUrl: string;
  restUrl: string;
}

const MAX_EVENT_LOG_SIZE = 100;

// Calculate prices from market quantities
function calculatePrices(market: { qBall: number; qStrike: number; b: number } | null) {
  if (!market) {
    return { priceBall: 0.5, priceStrike: 0.5 };
  }

  const { qBall, qStrike, b } = market;
  // LMSR price calculation: exp(qi/b) / sum(exp(qj/b))
  const maxQ = Math.max(qBall, qStrike);
  const expBall = Math.exp((qBall - maxQ) / b);
  const expStrike = Math.exp((qStrike - maxQ) / b);
  const sumExp = expBall + expStrike;

  return {
    priceBall: expBall / sumExp,
    priceStrike: expStrike / sumExp,
  };
}

export function App({ wsUrl, restUrl }: AppProps) {
  const { exit } = useApp();
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [prices, setPrices] = useState({ priceBall: 0.5, priceStrike: 0.5 });

  // Connect to WebSocket for real-time events
  const { connected, lastMessage, error: wsError, reconnectAttempts } = useWebSocket(wsUrl);

  // Poll admin state for system info
  const { state, positions, error: adminError, loading: adminLoading } = useAdminState(restUrl);

  // Handle keyboard input
  useInput((input) => {
    if (input === 'q') {
      exit();
    }
  });

  // Add new WebSocket messages to event log
  useEffect(() => {
    if (lastMessage) {
      const entry: EventLogEntry = {
        timestamp: new Date(),
        type: lastMessage.type,
        message: formatWsMessage(lastMessage),
        raw: lastMessage,
      };

      setEvents((prev) => {
        const next = [...prev, entry];
        // Trim to max size
        if (next.length > MAX_EVENT_LOG_SIZE) {
          return next.slice(-MAX_EVENT_LOG_SIZE);
        }
        return next;
      });

      // Update prices from ODDS_UPDATE messages
      if (lastMessage.type === 'ODDS_UPDATE') {
        setPrices({
          priceBall: lastMessage.priceBall,
          priceStrike: lastMessage.priceStrike,
        });
      }
    }
  }, [lastMessage]);

  // Update prices from polled state
  useEffect(() => {
    if (state?.market) {
      const calculated = calculatePrices(state.market);
      setPrices(calculated);
    }
  }, [state]);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box
        borderStyle="double"
        paddingX={2}
        justifyContent="space-between"
      >
        <Text bold color="cyan">
          PULSEPLAY DEVELOPER DASHBOARD
        </Text>
        <Text color="gray">Press 'q' to quit</Text>
      </Box>

      {/* Main content - two columns */}
      <Box>
        {/* Left column */}
        <Box flexDirection="column" width="50%">
          <MarketPanel
            state={state}
            priceBall={prices.priceBall}
            priceStrike={prices.priceStrike}
          />
          <PositionsPanel positions={positions} />
        </Box>

        {/* Right column */}
        <Box flexDirection="column" width="50%">
          <SystemInfo
            wsConnected={connected}
            wsError={wsError}
            reconnectAttempts={reconnectAttempts}
            state={state}
            adminError={adminError}
            adminLoading={adminLoading}
          />
          <EventLog events={events} maxDisplay={8} />
        </Box>
      </Box>

      {/* Footer - connection info */}
      <Box paddingX={1}>
        <Text color="gray" dimColor>
          WS: {wsUrl} | REST: {restUrl}
        </Text>
      </Box>
    </Box>
  );
}
