'use client';

import { useState } from 'react';
import { depositLP } from '@/lib/api';

interface LPDepositFormProps {
  address: string | null;
  className?: string;
  onDeposit?: () => void;
}

const PRESET_AMOUNTS = [10, 50, 100, 500];

export function LPDepositForm({ address, className = '', onDeposit }: LPDepositFormProps) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const numericAmount = amount ? Number(amount) : 0;
  const isValid = numericAmount > 0;

  const handlePresetClick = (preset: number) => {
    setAmount(String(preset));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async () => {
    if (!address || !isValid) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await depositLP(address, numericAmount);
      setSuccess(`Deposited $${numericAmount} — received ${result.shares.toFixed(2)} shares`);
      setAmount('');
      onDeposit?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!address) {
    return (
      <div className={`bg-surface-raised border border-border rounded-lg p-6 ${className}`} data-testid="lp-deposit-form">
        <h2 className="text-sm font-mono uppercase tracking-wider text-text-secondary mb-4">Deposit to Pool</h2>
        <p className="text-text-muted text-sm" data-testid="lp-deposit-connect">Connect wallet to deposit</p>
      </div>
    );
  }

  return (
    <div className={`bg-surface-raised border border-border rounded-lg p-6 ${className}`} data-testid="lp-deposit-form">
      <h2 className="text-sm font-mono uppercase tracking-wider text-text-secondary mb-4">Deposit to Pool</h2>

      <div className="mb-4">
        <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-2">Amount (USD)</label>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetClick(preset)}
              className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                amount === String(preset)
                  ? 'bg-blue-500/20 border border-blue-500 text-blue-400'
                  : 'bg-surface-input border border-border text-text-secondary hover:border-border-emphasis'
              }`}
              data-testid={`deposit-preset-${preset}`}
            >
              ${preset}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
            setSuccess(null);
          }}
          placeholder="Enter amount"
          min={0}
          step="any"
          className="w-full bg-surface-input border border-border rounded-lg px-4 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          data-testid="deposit-amount-input"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-400" data-testid="deposit-error">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 text-sm text-green-400" data-testid="deposit-success">
          {success}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting}
        className="w-full py-3 rounded-lg font-medium bg-accent hover:bg-accent-hover text-white disabled:bg-surface-input disabled:text-text-muted disabled:cursor-not-allowed transition-colors"
        data-testid="deposit-submit"
      >
        {isSubmitting ? 'Depositing...' : isValid ? `Deposit $${numericAmount}` : 'Deposit'}
      </button>
    </div>
  );
}
