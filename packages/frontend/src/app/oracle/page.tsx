'use client';

import { GameControls, MarketControls, StateDisplay } from '@/components/oracle';
import { OddsDisplay } from '@/components/bettor';

export default function OraclePage() {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Oracle Control Panel</h1>
        <p className="text-gray-400 mt-2">
          Manage game state, markets, and outcomes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GameControls />
          <MarketControls />
        </div>
        <div className="space-y-6">
          <OddsDisplay />
          <StateDisplay />
        </div>
      </div>
    </div>
  );
}
