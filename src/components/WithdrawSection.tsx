import React, { useEffect, useState } from 'react'

interface WithdrawSectionProps {
  clubShortId: string;
  onWithdraw: (userId: string, amount: number) => Promise<void>;
  getClubBalance: () => Promise<number>;
  isActive: boolean;
  isLoading: boolean;
  onError: (message: string) => void;
}

export const WithdrawSection: React.FC<WithdrawSectionProps> = ({
  clubShortId,
  onWithdraw,
  getClubBalance,
  isActive,
  isLoading,
  onError,
}) => {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [clubBalance, setClubBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isActive && clubShortId) {
      loadClubBalance();
    }
  }, [isActive, clubShortId]);

  const loadClubBalance = async () => {
    setIsLoadingBalance(true);
    setError(null);
    try {
      const balance = await getClubBalance();
      setClubBalance(balance);
    } catch (err) {
      setError((err as Error).message || 'Не удалось загрузить баланс клуба');
      setClubBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId.trim()) {
      setError('Введите User ID');
      return;
    }

    const amountNum = Number(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Введите корректную сумму');
      return;
    }

    if (clubBalance !== null && amountNum > clubBalance) {
      setError('Сумма превышает баланс клуба');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      await onWithdraw(userId.trim(), amountNum);
      setSuccessMessage('Вывод средств выполнен успешно');
      setUserId('');
      setAmount('');
      // Обновляем баланс после успешного вывода
      await loadClubBalance();
    } catch (err) {
      const errorMessage = (err as Error).message || 'Ошибка при выводе средств';
      setError(errorMessage);
      // Показываем ошибку через ErrorSection как при депозите
      onError(errorMessage);
    }
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return '—';
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (!isActive) {
    return null;
  }

  return (
    <section id="step-withdraw" className={`section ${isActive ? 'active' : ''}`}>
      <div className="card">
        <h2>Вывод средств</h2>
        
        <div className="club-balance-section" style={{ marginBottom: '20px', padding: '16px', background: 'var(--surface)', borderRadius: '12px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Баланс клуба
          </label>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {isLoadingBalance ? (
              <span>Загрузка...</span>
            ) : (
              <span style={{ color: 'var(--accent)' }}>
                {formatNumber(clubBalance)} USDT
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="withdraw-user-id">User ID</label>
            <input
              id="withdraw-user-id"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Введите User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="withdraw-amount">Сумма (USDT)</label>
            <input
              id="withdraw-amount"
              type="number"
              step="0.01"
              min="0.01"
              autoComplete="off"
              placeholder="Введите сумму"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className="error-message" style={{ 
              padding: '12px', 
              background: 'rgba(248, 113, 113, 0.1)', 
              border: '1px solid var(--error)', 
              borderRadius: '8px', 
              color: 'var(--error)', 
              fontSize: '0.9rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{ 
              padding: '12px', 
              background: 'rgba(76, 175, 80, 0.1)', 
              border: '1px solid #4CAF50', 
              borderRadius: '8px', 
              color: '#4CAF50', 
              fontSize: '0.9rem',
              marginBottom: '16px'
            }}>
              {successMessage}
            </div>
          )}

          <button type="submit" disabled={isLoading || isLoadingBalance}>
            {isLoading ? 'Отправка...' : 'Send'}
          </button>
        </form>
      </div>
      {isLoading && (
        <div className="loader"></div>
      )}
    </section>
  );
};



