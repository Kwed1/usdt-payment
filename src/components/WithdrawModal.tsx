import React, { useEffect, useState } from 'react'

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubShortId: string;
  onWithdraw: (userId: string, amount: number) => Promise<void>;
  getClubBalance: () => Promise<number>;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  clubShortId,
  onWithdraw,
  getClubBalance,
}) => {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [clubBalance, setClubBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && clubShortId) {
      loadClubBalance();
    }
  }, [isOpen, clubShortId]);

  const loadClubBalance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const balance = await getClubBalance();
      setClubBalance(balance);
    } catch (err) {
      setError((err as Error).message || 'Не удалось загрузить баланс клуба');
      setClubBalance(null);
    } finally {
      setIsLoading(false);
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

    setIsSubmitting(true);
    setError(null);

    try {
      await onWithdraw(userId.trim(), amountNum);
      // Закрываем модальное окно после успешного вывода
      handleClose();
    } catch (err) {
      setError((err as Error).message || 'Ошибка при выводе средств');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setUserId('');
    setAmount('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const formatNumber = (value: number | null) => {
    if (value === null) return '—';
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Вывод средств</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="club-balance-section">
            <label>Баланс клуба</label>
            <div className="balance-display">
              {isLoading ? (
                <span>Загрузка...</span>
              ) : (
                <span className="balance-value">
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
                placeholder="Введите User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isSubmitting}
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
                placeholder="Введите сумму"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            {error && (
              <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
                {error}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? 'Отправка...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};



