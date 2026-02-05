'use client';

import { OddsDisplay, BetForm, PositionList } from '@/components/bettor';

export default function BettorPage() {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Place Your Bets</h1>
        <p className="text-gray-400 mt-2">
          Predict the next pitch outcome: Ball or Strike
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <OddsDisplay />
          <BetForm />
        </div>
        <div>
          <PositionList />
        </div>
      </div>
    </div>
  );
}
