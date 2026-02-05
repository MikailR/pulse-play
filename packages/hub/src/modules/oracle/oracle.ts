import type { Outcome } from '../lmsr/types.js';
import type { GameState, AutoPlayConfig, OracleCallbacks } from './types.js';

const DEFAULT_AUTO_PLAY: AutoPlayConfig = {
  openDelayMs: 2000,
  closeDelayMs: 3000,
  resolveDelayMs: 1000,
  outcomes: 'RANDOM',
};

export class OracleService {
  private gameState: GameState = { active: false };
  private autoPlayTimer: ReturnType<typeof setTimeout> | null = null;
  private autoPlayRunning = false;
  private callbacks: OracleCallbacks | null = null;

  setCallbacks(callbacks: OracleCallbacks): void {
    this.callbacks = callbacks;
  }

  setGameActive(active: boolean): void {
    this.gameState.active = active;
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  isActive(): boolean {
    return this.gameState.active;
  }

  reset(): void {
    this.stopAutoPlay();
    this.gameState = { active: false };
  }

  startAutoPlay(config: Partial<AutoPlayConfig> = {}): void {
    if (this.autoPlayRunning) {
      this.stopAutoPlay();
    }

    const cfg: AutoPlayConfig = { ...DEFAULT_AUTO_PLAY, ...config };
    this.autoPlayRunning = true;
    let outcomeIndex = 0;

    const cycle = () => {
      if (!this.autoPlayRunning) return;

      // Step 1: open market
      this.callbacks?.onOpenMarket();

      this.autoPlayTimer = setTimeout(() => {
        if (!this.autoPlayRunning) return;

        // Step 2: close market
        this.callbacks?.onCloseMarket();

        this.autoPlayTimer = setTimeout(() => {
          if (!this.autoPlayRunning) return;

          // Step 3: resolve
          let outcome: Outcome;
          if (cfg.outcomes === 'RANDOM') {
            outcome = Math.random() < 0.5 ? 'BALL' : 'STRIKE';
          } else {
            outcome = cfg.outcomes[outcomeIndex % cfg.outcomes.length];
            outcomeIndex++;
          }
          this.callbacks?.onResolve(outcome);

          // Schedule next cycle
          this.autoPlayTimer = setTimeout(() => cycle(), cfg.openDelayMs);
        }, cfg.resolveDelayMs);
      }, cfg.closeDelayMs);
    };

    // Start first cycle after delay
    this.autoPlayTimer = setTimeout(() => cycle(), cfg.openDelayMs);
  }

  stopAutoPlay(): void {
    this.autoPlayRunning = false;
    if (this.autoPlayTimer !== null) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  isAutoPlayRunning(): boolean {
    return this.autoPlayRunning;
  }
}
