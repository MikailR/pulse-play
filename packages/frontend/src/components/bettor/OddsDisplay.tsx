'use client';

import { useMarket } from '@/providers/MarketProvider';

interface OddsDisplayProps {
  className?: string;
}

export function OddsDisplay({ className = '' }: OddsDisplayProps) {
  const { priceBall, priceStrike, market, isLoading } = useMarket();

  if (isLoading) {
    return (
      <div
        className={`bg-gray-800 rounded-lg p-6 ${className}`}
        data-testid="odds-loading"
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-24 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-700 rounded" />
            <div className="h-20 bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const formatPercent = (price: number) => `${(price * 100).toFixed(1)}%`;
  const formatOdds = (price: number) => {
    if (price <= 0) return '-';
    const americanOdds = price >= 0.5
      ? Math.round(-100 * price / (1 - price))
      : Math.round(100 * (1 - price) / price);
    return americanOdds > 0 ? `+${americanOdds}` : String(americanOdds);
  };

  const isMarketOpen = market?.status === 'OPEN';

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`} data-testid="odds-display">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Current Odds</h2>
        <span
          className={`text-xs px-2 py-1 rounded ${
            isMarketOpen
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-600/50 text-gray-400'
          }`}
          data-testid="market-status-badge"
        >
          {market?.status || 'NO MARKET'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div
          className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center"
          data-testid="odds-ball"
        >
          <div className="text-2xl font-bold text-blue-400" data-testid="price-ball-percent">
            {formatPercent(priceBall)}
          </div>
          <div className="text-sm text-gray-400 mt-1" data-testid="price-ball-american">
            {formatOdds(priceBall)}
          </div>
          <div className="text-xs text-gray-500 mt-2">Ball</div>
        </div>
        <div
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center"
          data-testid="odds-strike"
        >
          <div className="text-2xl font-bold text-red-400" data-testid="price-strike-percent">
            {formatPercent(priceStrike)}
          </div>
          <div className="text-sm text-gray-400 mt-1" data-testid="price-strike-american">
            {formatOdds(priceStrike)}
          </div>
          <div className="text-xs text-gray-500 mt-2">Strike</div>
        </div>
      </div>
    </div>
  );
}
