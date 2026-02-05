import React from 'react';

// Mock wagmi config
export function createConfig() {
  return {
    chains: [],
    connectors: [],
    transports: {},
  };
}

export function http() {
  return {};
}

// Mock WagmiProvider
export function WagmiProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

// Mock hooks
export function useAccount() {
  return {
    address: undefined,
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    status: 'disconnected',
  };
}

export function useConnect() {
  return {
    connect: jest.fn(),
    connectors: [],
    isPending: false,
    isError: false,
    error: null,
  };
}

export function useDisconnect() {
  return {
    disconnect: jest.fn(),
    isPending: false,
  };
}
