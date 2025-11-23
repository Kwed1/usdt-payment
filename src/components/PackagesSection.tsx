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
  isVerifyingProof?: boolean;
  proofError?: string | null;
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
  isVerifyingProof = false,
  proofError = null,
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

  const handlePackageClick = (chipsAmount: number) => {
    if (!walletConnected) {
      handleConnectWallet();
      return;
    }
    // Конвертируем количество фишек в USDT с точностью до 2 знаков
    const usdtAmount = chipsAmount * pricePerChip;
    const preciseUsdtAmount = Math.round(usdtAmount * 100) / 100; // Округляем до 2 знаков
    setSelectedPackage(chipsAmount);
    console.log('Package selected - chips:', chipsAmount, 'USDT:', preciseUsdtAmount);
    onAmountSelect(String(preciseUsdtAmount));
  };

  const handleCustomAmount = () => {
    if (!walletConnected) {
      handleConnectWallet();
      return;
    }

    // Пользователь вводит сумму в USDT - используем именно то, что он ввел
    const usdtValue = parseFloat(customAmount);
    if (!customAmount || isNaN(usdtValue) || usdtValue <= 0) {
      return;
    }

    // Используем точно то, что ввел пользователь - без корректировок
    // Ограничения будут проверяться на бэкенде
    const finalUsdt = usdtValue;
    
    console.log('handleCustomAmount - input USDT:', usdtValue, 'finalUsdt:', finalUsdt);
    
    setSelectedPackage(null);
    onAmountSelect(String(finalUsdt));
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
        {clubMessage && (
          <div className="club-message">{clubMessage}</div>
        )}
        <div id="packages-list" className="packages">
          {sale.quick_packages.map((amountValue) => {
            const amount = Number(amountValue);
            // Точная цена в USDT с округлением до 2 знаков
            const price = Math.round(amount * pricePerChip * 100) / 100;
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
            <label htmlFor="custom-amount">Свой вариант (USDT)</label>
            <div className="custom-amount-wrapper">
              <input
                id="custom-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Например: 1.5"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCustomAmount();
                  }
                }}
                disabled={isVerifyingProof}
              />
              <button 
                type="button" 
                id="custom-amount-button" 
                onClick={handleCustomAmount}
                disabled={isVerifyingProof}
              >
                {isVerifyingProof 
                  ? 'Проверка...' 
                  : walletConnected 
                    ? 'Добавить' 
                    : 'Подключить кошелек'}
              </button>
            </div>
            {customRangeParts.length > 0 && (
              <p className="hint" id="custom-range-hint">
                Допустимый диапазон фишек: {customRangeParts.join(' ')}. Введите сумму в USDT.
              </p>
            )}
            {isVerifyingProof && (
              <p className="hint" style={{ color: 'var(--accent)', marginTop: '8px' }}>
                Проверка кошелька...
              </p>
            )}
            {proofError && (
              <p className="hint" style={{ color: 'var(--error)', marginTop: '8px' }}>
                {proofError}
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

