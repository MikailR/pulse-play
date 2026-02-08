'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { useWalletClient } from 'wagmi';
import {
  createGetConfigMessageV2,
  createGetLedgerBalancesMessage,
  parseGetLedgerBalancesResponse,
  type MessageSigner,
} from '@erc7824/nitrolite';
import { useWallet } from './WagmiProvider';
import { openClearnodeWs, authenticateBrowser, sendAndWaitBrowser } from '@/lib/clearnode';
import {
  createAppSession as createAppSessionFn,
  closeAppSession as closeAppSessionFn,
  submitAppState as submitAppStateFn,
  transfer as transferFn,
  getAppSessions as getAppSessionsFn,
  getConfig as getConfigFn,
} from '@/lib/clearnode/methods';
import type { ClearnodeStatus, ClearnodeContextValue } from '@/lib/clearnode/types';
import { CLEARNODE_URL, PRIVATE_KEY } from '@/lib/config';

const notConnectedError = () => { throw new Error('Clearnode is not connected'); };

const ClearnodeContext = createContext<ClearnodeContextValue>({
  status: 'disconnected',
  error: null,
  isSessionValid: false,
  expiresAt: 0,
  signer: null,
  ws: null,
  balance: null,
  allowanceAmount: 1000,
  setAllowanceAmount: () => { },
  refreshBalance: async () => { },
  reconnect: async () => { },
  disconnect: () => { },
  createAppSession: notConnectedError,
  closeAppSession: notConnectedError,
  submitAppState: notConnectedError,
  transfer: notConnectedError,
  getAppSessions: notConnectedError,
  getConfig: notConnectedError,
});

export function useClearnode() {
  return useContext(ClearnodeContext);
}

interface ClearnodeProviderProps {
  children: ReactNode;
  url?: string;
}

export function ClearnodeProvider({ children, url = CLEARNODE_URL }: ClearnodeProviderProps) {
  const { address, isConnected: walletConnected, mode } = useWallet();
  const { data: wagmiWalletClient } = useWalletClient();

  const [status, setStatus] = useState<ClearnodeStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState<MessageSigner | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [allowanceAmount, setAllowanceAmount] = useState<number>(1000);
  const allowanceAmountRef = useRef<number>(allowanceAmount);

  const wsRef = useRef<WebSocket | null>(null);
  const signerRef = useRef<MessageSigner | null>(null);
  const expiresAtRef = useRef<number>(0);
  const connectPromiseRef = useRef<Promise<void> | null>(null);

  // Keep the ref in sync so authenticate() reads the latest value without depending on it
  useEffect(() => {
    allowanceAmountRef.current = allowanceAmount;
  }, [allowanceAmount]);

  const isSessionValid = signer !== null && expiresAt > Date.now();

  // Core authentication function
  const authenticate = useCallback(async () => {
    setStatus('connecting');
    setError(null);

    let newWs: WebSocket;
    try {
      newWs = await openClearnodeWs(url);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'WebSocket connection failed');
      throw err;
    }

    wsRef.current = newWs;
    setWs(newWs);
    setStatus('authenticating');

    try {
      // Get or create the wallet client for signing
      let walletClient;
      if (mode === 'private-key' && PRIVATE_KEY) {
        walletClient = createWalletClient({
          account: privateKeyToAccount(PRIVATE_KEY),
          chain: sepolia,
          transport: http(),
        });
      } else {
        walletClient = wagmiWalletClient;
      }

      if (!walletClient) {
        throw new Error('No wallet client available for signing');
      }

      const result = await authenticateBrowser(newWs, walletClient, {
        allowances: [{ asset: 'ytest.usd', amount: String(allowanceAmountRef.current * 1_000_000) }],
      });
      // setSigner(result.signer);
      setSigner(() => result.signer);
      signerRef.current = result.signer;
      setExpiresAt(result.expiresAt);
      expiresAtRef.current = result.expiresAt;
      setStatus('connected');

      // Detect server-side drops — signer stays valid for light reconnect
      newWs.addEventListener('close', () => {
        if (wsRef.current === newWs) {
          setWs(null);
          setStatus('disconnected');
        }
      });
      newWs.addEventListener('error', () => {
        if (wsRef.current === newWs) {
          setWs(null);
          setStatus('disconnected');
        }
      });

      // Fetch balance after successful auth
      try {
        const msg = await createGetLedgerBalancesMessage(result.signer);
        const raw = await sendAndWaitBrowser(newWs, msg, 'get_ledger_balances');
        const response = parseGetLedgerBalancesResponse(raw);
        const entry = response.params.ledgerBalances.find(
          (b: { asset: string; amount: string }) => b.asset === 'ytest.usd',
        );
        setBalance(entry ? entry.amount : '0');
      } catch {
        // Balance fetch failure is non-fatal
      }
    } catch (err) {
      newWs.close();
      wsRef.current = null;
      setWs(null);
      signerRef.current = null;
      expiresAtRef.current = 0;
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Authentication failed');
      throw err;
    }
  }, [url, mode, wagmiWalletClient]);

  // Reconnect (manual re-auth)
  const reconnect = useCallback(async () => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setWs(null);
    }
    setSigner(null);
    signerRef.current = null;
    setBalance(null);
    setExpiresAt(0);
    expiresAtRef.current = 0;

    try {
      await authenticate();
    } catch {
      // Error already captured in state by authenticate()
    }
  }, [authenticate]);

  // Disconnect
  const disconnectClearnode = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWs(null);
    setSigner(null);
    signerRef.current = null;
    setBalance(null);
    setExpiresAt(0);
    expiresAtRef.current = 0;
    setStatus('disconnected');
    setError(null);
  }, []);

  // Ensure connection is alive before calling a method — always does full auth
  const ensureConnected = useCallback(async () => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN &&
      signerRef.current &&
      expiresAtRef.current > Date.now()
    ) return;
    if (connectPromiseRef.current) return connectPromiseRef.current;

    connectPromiseRef.current = authenticate().finally(() => {
      connectPromiseRef.current = null;
    });
    return connectPromiseRef.current;
  }, [authenticate]);

  // Fetch balance from Clearnode (auto-reconnects if WS is dead)
  const refreshBalance = useCallback(async () => {
    try {
      await ensureConnected();
    } catch {
      return; // Reconnect failed — non-fatal
    }
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !signerRef.current) return;

    try {
      const msg = await createGetLedgerBalancesMessage(signerRef.current);
      const raw = await sendAndWaitBrowser(wsRef.current, msg, 'get_ledger_balances');
      const response = parseGetLedgerBalancesResponse(raw);
      const entry = response.params.ledgerBalances.find(
        (b: { asset: string; amount: string }) => b.asset === 'ytest.usd',
      );
      setBalance(entry ? entry.amount : '0');
    } catch {
      // Balance fetch failure is non-fatal
    }
  }, [ensureConnected]);

  // ── Clearnode RPC method wrappers ──

  const createAppSessionCb = useCallback(
    async (params: Parameters<ClearnodeContextValue['createAppSession']>[0]) => {
      await ensureConnected();
      return createAppSessionFn(wsRef.current, signerRef.current, address as `0x${string}`, params);
    },
    [ensureConnected, address],
  );

  const closeAppSessionCb = useCallback(
    async (params: Parameters<ClearnodeContextValue['closeAppSession']>[0]) => {
      await ensureConnected();
      return closeAppSessionFn(wsRef.current, signerRef.current, params);
    },
    [ensureConnected],
  );

  const submitAppStateCb = useCallback(
    async (params: Parameters<ClearnodeContextValue['submitAppState']>[0]) => {
      await ensureConnected();
      return submitAppStateFn(wsRef.current, signerRef.current, params);
    },
    [ensureConnected],
  );

  const transferCb = useCallback(
    async (params: Parameters<ClearnodeContextValue['transfer']>[0]) => {
      await ensureConnected();
      return transferFn(wsRef.current, signerRef.current, params);
    },
    [ensureConnected],
  );

  const getAppSessionsCb = useCallback(
    async (filterStatus?: string) => {
      await ensureConnected();
      return getAppSessionsFn(wsRef.current, signerRef.current, address as `0x${string}`, filterStatus);
    },
    [ensureConnected, address],
  );

  const getConfigCb = useCallback(
    async () => {
      await ensureConnected();
      return getConfigFn(wsRef.current);
    },
    [ensureConnected],
  );

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (!walletConnected || !address) {
      // Wallet disconnected — clean up Clearnode session
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWs(null);
      setSigner(null);
      signerRef.current = null;
      setBalance(null);
      setExpiresAt(0);
      expiresAtRef.current = 0;
      setStatus('disconnected');
      setError(null);
      return;
    }

    // In MetaMask mode, wait for wagmiWalletClient to be available
    if (mode === 'metamask' && !wagmiWalletClient) return;

    let intentionalClose = false;

    const connect = async () => {
      if (intentionalClose) return;
      try {
        await authenticate();
      } catch {
        // Error already captured in state by authenticate()
      }
    };

    connect();

    return () => {
      intentionalClose = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [walletConnected, address, mode, wagmiWalletClient, authenticate]);

  // Keepalive — prevent Clearnode idle timeout by sending a lightweight message every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(createGetConfigMessageV2());
        } catch {
          // Keepalive send failure is non-fatal
        }
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const value: ClearnodeContextValue = {
    status,
    error,
    isSessionValid,
    expiresAt,
    signer,
    ws,
    balance,
    allowanceAmount,
    setAllowanceAmount,
    refreshBalance,
    reconnect,
    disconnect: disconnectClearnode,
    createAppSession: createAppSessionCb,
    closeAppSession: closeAppSessionCb,
    submitAppState: submitAppStateCb,
    transfer: transferCb,
    getAppSessions: getAppSessionsCb,
    getConfig: getConfigCb,
  };

  return (
    <ClearnodeContext.Provider value={value}>
      {children}
    </ClearnodeContext.Provider>
  );
}
