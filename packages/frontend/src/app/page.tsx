'use client';

import { useState } from 'react';
import { SportFilter, GameList } from '@/components/games';

export default function GamesPage() {
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Active Games</h1>
        <p className="text-gray-400 mt-2">
          Browse games and place your bets
        </p>
      </div>

      <SportFilter selected={selectedSport} onSelect={setSelectedSport} />
      <GameList sportId={selectedSport} />
    </div>
  );
}
