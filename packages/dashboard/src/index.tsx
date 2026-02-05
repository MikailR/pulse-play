#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

// Parse CLI arguments
const args = process.argv.slice(2);

// Default URLs
let hubUrl = 'http://localhost:3001';

// Check for help flag
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
PulsePlay Developer Dashboard

Usage: pulse-dashboard [hub-url]

Arguments:
  hub-url    Base URL for the hub server (default: http://localhost:3001)

Examples:
  pulse-dashboard
  pulse-dashboard http://localhost:3001
  pulse-dashboard http://192.168.1.100:3001

Controls:
  q    Quit the dashboard
`);
  process.exit(0);
}

// Parse hub URL from first positional argument
if (args.length > 0 && !args[0].startsWith('-')) {
  hubUrl = args[0];
}

// Normalize URL (strip trailing slash)
hubUrl = hubUrl.replace(/\/$/, '');

// Derive WebSocket URL from HTTP URL
const wsUrl = hubUrl.replace(/^http/, 'ws') + '/ws';

// Render the app
const { waitUntilExit } = render(
  <App wsUrl={wsUrl} />
);

// Wait for exit
waitUntilExit().then(() => {
  process.exit(0);
});
