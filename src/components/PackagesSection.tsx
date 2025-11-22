import React, { useState } from 'react';
import type { Sale } from '../types';

interface PackagesSectionProps {
  sale: Sale | null;
  clubMessage: string;
  onAmountSelect: (amount: string) => void;
  isLoading: boolean;
  isActive: boolean;
  walletConnected: boolean;
  onConnectWallet: () => Promise<void>;
}

function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export const PackagesSection: React.FC<PackagesSectionProps> = ({
  sale,
  clubMessage,
  onAmountSelect,
  isLoading,
  isActive,
  walletConnected,
  onConnectWallet,
}) => {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);

  if (!sale) {
    return null;
  }

  const pricePerChip = Number(sale.price_per_chip);

  const handleConnectWallet = async () => {
    try {
      await onConnectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handlePackageClick = (amount: number) => {
    if (!walletConnected) {
      handleConnectWallet();
      return;
    }
    setSelectedPackage(amount);
    onAmountSelect(String(amount));
  };

  const handleCustomAmount = () => {
    if (!walletConnected) {
      handleConnectWallet();
      return;
    }

    const value = Number(customAmount);
    if (!customAmount || isNaN(value) || value <= 0 || !Number.isInteger(value)) {
      return;
    }

    let finalValue = value;

    if (sale.min_custom_amount && value < Number(sale.min_custom_amount)) {
      finalValue = Number(sale.min_custom_amount);
      setCustomAmount(String(finalValue));
      return;
    }

    if (sale.max_custom_amount && value > Number(sale.max_custom_amount)) {
      finalValue = Number(sale.max_custom_amount);
      setCustomAmount(String(finalValue));
      return;
    }

    if (sale.custom_step) {
      const base = sale.min_custom_amount ? Number(sale.min_custom_amount) : 0;
      const step = Number(sale.custom_step);
      if (step > 0 && ((value - base) % step !== 0)) {
        finalValue = value - ((value - base) % step);
        setCustomAmount(String(finalValue));
        return;
      }
    }

    setSelectedPackage(null);
    onAmountSelect(String(Math.round(finalValue)));
  };

  const customRangeParts: string[] = [];
  if (sale.min_custom_amount) {
    customRangeParts.push(`от ${formatNumber(sale.min_custom_amount, 0)}`);
  }
  if (sale.max_custom_amount) {
    customRangeParts.push(`до ${formatNumber(sale.max_custom_amount, 0)}`);
  }
  if (sale.custom_step) {
    customRangeParts.push(`шаг ${formatNumber(sale.custom_step, 0)}`);
  }

  return (
    <section id="step-packages" className={`section ${isActive ? 'active' : ''}`}>
      <div className="card">
        <h2>Выберите количество фишек</h2>
        {clubMessage && (
          <div className="club-message">{clubMessage}</div>
        )}
        <div id="packages-list" className="packages">
          {sale.quick_packages.map((amountValue) => {
            const amount = Number(amountValue);
            const price = amount * pricePerChip;
            return (
              <div
                key={amount}
                className={`package-option ${selectedPackage === amount ? 'selected' : ''}`}
                onClick={() => handlePackageClick(amount)}
              >
                <span className="amount">
                  <img src="https://ppnards.ams3.cdn.digitaloceanspaces.com/ppnards/leaderboards/type_params/pp_chip.png" alt="chip" className="chip-icon" />
                  {formatNumber(amount, 0)}
                </span>
                <span className="price">
                  {formatNumber(price, 2)} USDT
                </span>
              </div>
            );
          })}
        </div>
        {sale.allow_custom_amount && (
          <div className="field" id="custom-amount-area" style={{ marginTop: '18px' }}>
            <label htmlFor="custom-amount">Свой вариант</label>
            <div className="custom-amount-wrapper">
              <input
                id="custom-amount"
                type="number"
                min="1"
                step="1"
                placeholder="Например: 150"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
              <button type="button" id="custom-amount-button" onClick={handleCustomAmount}>
                {walletConnected ? 'Добавить' : 'Подключить кошелек'}
              </button>
            </div>
            {customRangeParts.length > 0 && (
              <p className="hint" id="custom-range-hint">
                Допустимый диапазон: {customRangeParts.join(' ')}
              </p>
            )}
          </div>
        )}
      </div>
      {isLoading && (
        <div id="packages-loader" className="loader"></div>
      )}
    </section>
  );
};

