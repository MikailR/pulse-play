import React from 'react';

// Mock wagmi config
export function createConfig(options?: { connectors?: unknown[] }) {
  return {
    chains: [],
    connectors: options?.connectors || [],
    transports: {},
  };
}

export function http() {
  return {};
}

// Mock injected connector - defined early so it can be used by useConnect
export function injected() {
  return { id: 'injected', name: 'Injected', type: 'injected' };
}

// Mock WagmiProvider
export function WagmiProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

// Mock hooks - these can be overridden in tests
let mockAccountState = {
  address: undefined as `0x${string}` | undefined,
  isConnected: false,
  isConnecting: false,
  isDisconnected: true,
  status: 'disconnected' as const,
  chain: undefined as { id: number; name: string } | undefined,
};

let mockConnectFn = jest.fn();
let mockDisconnectFn = jest.fn();
let mockConnectPending = false;
let mockWalletClient: unknown = null;

export function useAccount() {
  return mockAccountState;
}

export function useConnect() {
  return {
    connect: mockConnectFn,
    connectors: [injected()],
    isPending: mockConnectPending,
    isError: false,
    error: null,
  };
}

export function useDisconnect() {
  return {
    disconnect: mockDisconnectFn,
    isPending: false,
  };
}

export function useWalletClient() {
  return {
    data: mockWalletClient,
    isLoading: false,
    isError: false,
  };
}

let mockSwitchChainFn = jest.fn();

export function useSwitchChain() {
  return {
    switchChain: mockSwitchChainFn,
    isPending: false,
    isError: false,
    error: null,
  };
}

// Test utilities to configure mock state
export function __setMockAccountState(state: Partial<typeof mockAccountState>) {
  mockAccountState = { ...mockAccountState, ...state };
}

export function __setMockConnectFn(fn: jest.Mock) {
  mockConnectFn = fn;
}

export function __setMockDisconnectFn(fn: jest.Mock) {
  mockDisconnectFn = fn;
}

export function __setMockConnectPending(pending: boolean) {
  mockConnectPending = pending;
}

export function __setMockWalletClient(client: unknown) {
  mockWalletClient = client;
}

export function __setMockSwitchChainFn(fn: jest.Mock) {
  mockSwitchChainFn = fn;
}

export function __resetMocks() {
  mockAccountState = {
    address: undefined,
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    status: 'disconnected',
    chain: undefined,
  };
  mockConnectFn = jest.fn();
  mockDisconnectFn = jest.fn();
  mockConnectPending = false;
  mockWalletClient = null;
  mockSwitchChainFn = jest.fn();
}
