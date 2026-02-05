import type { Hex, Address } from "viem";

export interface ClearnodeConfig {
  /** WebSocket endpoint, e.g. wss://clearnet-sandbox.yellow.com/ws */
  url: string;
  /** Market Maker wallet private key */
  mmPrivateKey: Hex;
  /** Application name registered with the Clearnode */
  application: string;
  /** Token allowances for auth session */
  allowances: { asset: string; amount: string }[];
  /** Faucet URL for sandbox environments */
  faucetUrl?: string;
}

export interface SubmitAppStateParams {
  appSessionId: Hex;
  intent: "operate" | "deposit" | "withdraw";
  version: number;
  allocations: AppSessionAllocation[];
  sessionData?: string;
}

export interface CloseSessionParams {
  appSessionId: Hex;
  allocations: AppSessionAllocation[];
  sessionData?: string;
}

export interface TransferParams {
  destination: Address;
  asset: string;
  amount: string;
}

export interface AppSessionAllocation {
  asset: string;
  amount: string;
  participant: Address;
}
