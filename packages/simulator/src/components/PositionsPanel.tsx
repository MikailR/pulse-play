import React from 'react';
import { Box, Text } from 'ink';
import type { Position } from '../types.js';
import {
  truncateAddress,
  formatDollars,
  formatOutcomeShort,
  formatVersion,
  formatStatusBadge,
  getOutcomeColor,
  getSessionStatusColor,
} from '../utils/formatters.js';

interface PositionsPanelProps {
  positions: Position[];
  scrollOffset: number;
  visibleCount: number;
  isActive: boolean;
  panelWidth: number;
  selectedIndex?: number;
  expandedIndex?: number;
}

/** Parse sessionData JSON and render key fields. */
function SessionDataExpanded({ sessionData }: { sessionData?: string }) {
  if (!sessionData) {
    return <Text color="gray" dimColor>  No session data available</Text>;
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(sessionData);
  } catch {
    return <Text color="gray" dimColor>  Invalid session data</Text>;
  }

  const v = data.v as number;

  if (v === 2) {
    const amount = Number(data.amount) || 0;
    const shares = Number(data.shares) || 0;
    const price = Number(data.effectivePricePerShare) || 0;
    const fee = Number(data.fee) || 0;
    const feePct = Number(data.feePercent) || 0;

    return (
      <Box flexDirection="column" paddingLeft={2}>
        <Text color="gray" dimColor>{'─ V2 Session Data ─'}</Text>
        <Box gap={2}>
          <Text color="gray">market:</Text>
          <Text color="white">{String(data.marketId ?? '-')}</Text>
        </Box>
        <Box gap={2}>
          <Text color="gray">outcome:</Text>
          <Text color="cyan">{String(data.outcome ?? '-')}</Text>
        </Box>
        <Box gap={2}>
          <Text color="gray">amount:</Text>
          <Text color="green">{formatDollars(amount)}</Text>
        </Box>
        <Box gap={2}>
          <Text color="gray">shares:</Text>
          <Text color="white">{shares.toFixed(4)}</Text>
        </Box>
        <Box gap={2}>
          <Text color="gray">price/sh:</Text>
          <Text color="white">{price.toFixed(4)}</Text>
        </Box>
        <Box gap={2}>
          <Text color="gray">fee:</Text>
          <Text color="yellow">{formatDollars(fee)}</Text>
          <Text color="gray">({feePct}%)</Text>
        </Box>
        {/* {'preBetOdds' in data && 'postBetOdds' in data && (
          <Box gap={2}>
            <Text color="gray">pre-odds:</Text>
            <Text color="white">{JSON.stringify(data.preBetOdds)}</Text>
            <Text color="gray">post-odds:</Text>
            <Text color="white">{JSON.stringify(data.postBetOdds)}</Text>
          </Box>
        )} */}
      </Box>
    );
  }

  if (v === 3) {
    const result = String(data.result ?? '-');
    const resultColor = result === 'WIN' ? 'green' : 'red';
    const payout = Number(data.payout) || 0;
    const profit = Number(data.profit) || 0;
    const shares = Number(data.shares) || 0;
    const costPaid = Number(data.costPaid) || 0;

    return (
      <Box flexDirection="column" paddingLeft={2}>
        <Text color="gray" dimColor>{'─ V3 Settlement Data ─'}</Text>
        <Box gap={2}>
          <Text color="gray">resolution:</Text>
          <Text color="cyan">{String(data.resolution ?? '-')}</Text>
          <Text color="gray">result:</Text>
          <Text color={resultColor} bold>{result}</Text>
        </Box>
        <Box gap={2}>
          <Text color="gray">payout:</Text>
          <Text color="green">{formatDollars(payout)}</Text>
          <Text color="gray">profit:</Text>
          <Text color={profit >= 0 ? 'green' : 'red'}>
            {formatDollars(profit)}
          </Text>
        </Box>
        <Box gap={2}>
          <Text color="gray">shares:</Text>
          <Text color="white">{shares.toFixed(4)}</Text>
          <Text color="gray">costPaid:</Text>
          <Text color="white">{formatDollars(costPaid)}</Text>
        </Box>
      </Box>
    );
  }

  // Generic fallback
  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Text color="gray" dimColor>{'─ Session Data (v' + v + ') ─'}</Text>
      <Text color="white">{JSON.stringify(data, null, 2).slice(0, 200)}</Text>
    </Box>
  );
}

export function PositionsPanel({ positions, scrollOffset, visibleCount, isActive, panelWidth, selectedIndex, expandedIndex }: PositionsPanelProps) {
  const displayPositions = positions.slice(scrollOffset, scrollOffset + visibleCount);
  const endIndex = Math.min(scrollOffset + visibleCount, positions.length);
  const showIndicator = positions.length > visibleCount;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={isActive ? 'cyan' : undefined}
      paddingX={1}
      flexGrow={1}
    >
      {/* Title */}
      <Box justifyContent="center" gap={1} marginBottom={1}>
        <Text bold color="yellow">
          APP SESSIONS ({positions.length})
        </Text>
        {showIndicator && (
          <Text color="gray" dimColor>
            {scrollOffset + 1}-{endIndex} of {positions.length}
          </Text>
        )}
      </Box>

      {/* Column headers */}
      <Box>
        <Text color="gray" bold>
          {'SESSION'.padEnd(14)}
          {'BETTOR'.padEnd(14)}
          {'BET'.padEnd(6)}
          {'ALLOC'.padEnd(8)}
          {'VERSION'.padEnd(9)}
          {'STATUS'}
        </Text>
      </Box>

      {/* Separator */}
      <Text color="gray" dimColor>
        {'─'.repeat(panelWidth)}
      </Text>

      {/* Data rows */}
      {displayPositions.length > 0 ? (
        displayPositions.map((pos, idx) => {
          const absoluteIndex = scrollOffset + idx;
          const isSelected = isActive && selectedIndex === absoluteIndex;
          const isExpanded = expandedIndex === absoluteIndex;

          return (
            <React.Fragment key={`${pos.appSessionId}-${absoluteIndex}`}>
              <Box>
                {/* Selection indicator */}
                <Text color="cyan" bold>
                  {isSelected ? '>' : ' '}
                </Text>
                <Text color="yellow" inverse={isSelected}>
                  {truncateAddress(pos.appSessionId).padEnd(13)}
                </Text>
                <Text color="gray" inverse={isSelected}>
                  {truncateAddress(pos.address).padEnd(14)}
                </Text>
                <Text color={getOutcomeColor(pos.outcome)} bold inverse={isSelected}>
                  {formatOutcomeShort(pos.outcome).padEnd(6)}
                </Text>
                <Text color="green" inverse={isSelected}>
                  {formatDollars(pos.appSessionVersion === 1 ? pos.costPaid :
                    pos.appSessionVersion === 2 ? pos.costPaid - (pos.fee ?? 0) : 0).padStart(6).padEnd(8)}
                </Text>
                <Text color="white" dimColor inverse={isSelected}>
                  {formatVersion(pos.appSessionVersion).padStart(4).padEnd(9)}
                </Text>
                <Text color={getSessionStatusColor(pos.sessionStatus ?? 'open')} bold inverse={isSelected}>
                  {formatStatusBadge(pos.sessionStatus ?? 'open')}
                </Text>
              </Box>
              {/* Expanded session data */}
              {isExpanded && (
                <SessionDataExpanded sessionData={pos.sessionData} />
              )}
            </React.Fragment>
          );
        })
      ) : (
        <Box justifyContent="center" marginTop={1}>
          <Text color="gray" dimColor>
            Awaiting state channel activity...
          </Text>
        </Box>
      )}
    </Box>
  );
}
