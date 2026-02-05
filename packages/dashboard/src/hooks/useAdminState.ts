import { useState, useEffect, useRef } from 'react';
import type { AdminStateResponse, PositionsResponse, Position } from '../types.js';

export interface UseAdminStateResult {
  state: AdminStateResponse | null;
  positions: Position[];
  error: string | null;
  loading: boolean;
}

const DEFAULT_POLL_INTERVAL_MS = 1000;

export function useAdminState(
  baseUrl: string,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS
): UseAdminStateResult {
  const [state, setState] = useState<AdminStateResponse | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const fetchState = async () => {
      try {
        // Fetch admin state
        const stateRes = await fetch(`${baseUrl}/api/admin/state`);
        if (!stateRes.ok) {
          throw new Error(`HTTP ${stateRes.status}: ${stateRes.statusText}`);
        }
        const stateData = (await stateRes.json()) as AdminStateResponse;

        if (!mountedRef.current) return;
        setState(stateData);
        setError(null);
        setLoading(false);

        // Fetch positions if there's an active market
        if (stateData.market) {
          try {
            const posRes = await fetch(
              `${baseUrl}/api/admin/positions/${stateData.market.id}`
            );
            if (posRes.ok) {
              const posData = (await posRes.json()) as PositionsResponse;
              if (mountedRef.current) {
                setPositions(posData.positions);
              }
            }
          } catch {
            // Position fetch is optional, don't set error
          }
        } else {
          if (mountedRef.current) {
            setPositions([]);
          }
        }
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };

    // Initial fetch
    fetchState();

    // Start polling
    intervalRef.current = setInterval(fetchState, pollIntervalMs);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [baseUrl, pollIntervalMs]);

  return { state, positions, error, loading };
}
