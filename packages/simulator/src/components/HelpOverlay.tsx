import React from 'react';
import { Box, Text } from 'ink';

interface HelpOverlayProps {
  height: number;
}

export function HelpOverlay({ height }: HelpOverlayProps) {
  const lines = [
    { header: 'Game & Market' },
    { key: ':create [sport] [h] [a]', desc: 'Create game (default: baseball nyy bos)' },
    { key: ':open [cat]', desc: 'Open market in current game (default: pitching)' },
    { key: ':close', desc: 'Close current market' },
    { key: ':resolve <outcome>', desc: 'Resolve with outcome' },
    { key: ':complete', desc: 'Complete current game' },
    { header: 'Simulation' },
    { key: ':wallets <n>', desc: 'Generate N wallets' },
    { key: ':fund', desc: 'Fund all wallets via faucet' },
    { key: ':sim start', desc: 'Start automated betting' },
    { key: ':sim stop', desc: 'Stop automated betting' },
    { key: ':sim config', desc: 'View config (or set: key=val ...)' },
    { key: ':sim config keys', desc: 'bias, betAmountMin/Max, delayMin/MaxMs, maxBetsPerWallet, mode, mcpsMin/Max' },
    { key: ':sim p2p', desc: 'Start sim in P2P mode' },
    { key: ':sim mixed', desc: 'Start sim in mixed (LMSR+P2P) mode' },
    { key: ':sim lmsr', desc: 'Start sim in LMSR mode' },
    { header: 'P2P Order Book' },
    { key: ':p2p create <w> <out> <$> <mcps>', desc: 'Place P2P order (wallet# outcome amount mcps)' },
    { key: ':p2p cancel <orderId>', desc: 'Cancel P2P order' },
    { key: ':p2p depth', desc: 'Show order book depth in event log' },
    { key: ':p2p auto', desc: 'Set sim mode to p2p' },
    { key: ':p2p mixed', desc: 'Set sim mode to mixed (lmsr+p2p)' },
    { header: 'Admin' },
    { key: ':status', desc: 'Show backend state' },
    { key: ':reset', desc: 'Reset backend + clear wallets' },
    { key: ':fund-mm [n]', desc: 'Fund market maker ($10 x n)' },
    { key: ':games', desc: 'Browse games (overlay)' },
    { key: ':sports', desc: 'List sports in event log' },
    { key: ':markets', desc: 'Browse markets for current game (overlay)' },
    { header: 'Navigation' },
    { key: 'Tab', desc: 'Switch active panel' },
    { key: 'j / k', desc: 'Scroll active panel / move cursor' },
    { key: 'Enter / e', desc: 'Expand/collapse position detail' },
    { key: 'g / G', desc: 'Top / bottom of panel' },
    { header: 'General' },
    { key: ':', desc: 'Enter command mode' },
    { key: '?', desc: 'Toggle this help' },
    { key: 'Escape', desc: 'Dismiss help / cancel cmd' },
    { key: ':quit / :q', desc: 'Quit simulator' },
  ];

  const contentHeight = lines.length + 4;
  const topPad = Math.max(0, Math.floor((height - contentHeight) / 2));

  return (
    <Box flexDirection="column" flexGrow={1}>
      {topPad > 0 && <Box height={topPad} />}
      <Box flexDirection="column" flexGrow={1} paddingLeft={4}>
        <Box alignSelf="center">
          <Text bold color="cyan">COMMAND REFERENCE</Text>
        </Box>
        <Box alignSelf="center">
          <Text color="gray">{'─'.repeat(40)}</Text>
        </Box>
        {lines.map((line, idx) => {
          if ('header' in line && line.header) {
            return (
              <Box key={idx} marginTop={idx > 0 ? 1 : 0}>
                <Text bold color="yellow">{line.header}</Text>
              </Box>
            );
          }
          return (
            <Box key={idx} gap={2}>
              <Text color="cyan">{(line.key ?? '').padEnd(22)}</Text>
              <Text>{line.desc ?? ''}</Text>
            </Box>
          );
        })}
        <Box alignSelf="center" marginTop={1}>
          <Text color="gray" dimColor>Press ? or Escape to dismiss</Text>
        </Box>
      </Box>
    </Box>
  );
}
