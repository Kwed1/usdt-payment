import React from 'react';
import type { OwnerClub, OwnerStats, Payment } from '../types';

interface OwnerSelectorProps {
  ownerClubs: OwnerClub[];
  ownerClubsLoaded: boolean;
  ownerSelectorMessage: string | null;
  selectedOwnerClubShortId: number | null;
  ownerStats: OwnerStats | null;
  ownerStatsLoading: boolean;
  onClubSelect: (clubShortId: number | null) => void;
  onClubOpen: () => void;
}

function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return value || '';
  }
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const OwnerSelector: React.FC<OwnerSelectorProps> = ({
  ownerClubs,
  ownerClubsLoaded,
  ownerSelectorMessage,
  selectedOwnerClubShortId,
  ownerStats,
  ownerStatsLoading,
  onClubSelect,
  onClubOpen,
}) => {
  if (!ownerClubsLoaded && !ownerSelectorMessage) {
    return null;
  }

  const message = ownerSelectorMessage ||
    (ownerClubs.length
      ? 'Выберите клуб, чтобы посмотреть баланс и транзакции.'
      : 'У вас нет клубов с правом управления фишками.');

  const hasValue = selectedOwnerClubShortId !== null;
  const buttonDisabled = !hasValue || ownerStatsLoading;

  return (
    <>
      <div className="card" id="owner-selector">
        <h2>Управление клубами</h2>
        <p className="hint">{message}</p>
        {ownerClubs.length > 0 && (
          <div className="field" id="owner-selector-field">
            <label htmlFor="owner-club-select">Выберите клуб</label>
            <select
              id="owner-club-select"
              value={selectedOwnerClubShortId || ''}
              onChange={(e) => onClubSelect(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Выберите клуб —</option>
              {ownerClubs.map((club) => (
                <option key={club.short_id} value={club.short_id}>
                  {club.title ? `${club.title} (${club.short_id})` : `Клуб ${club.short_id}`}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="button"
          id="owner-club-open"
          disabled={buttonDisabled}
          onClick={onClubOpen}
        >
          {ownerStatsLoading ? 'Загрузка...' : 'Показать данные'}
        </button>
      </div>

      {ownerStats && ownerStats.allowed && (
        <div className="card" id="owner-card">
          <h2 id="owner-card-title">
            {ownerStats.club_title || 'Данные клуба'}
          </h2>
          {ownerStats.club_short_id && (
            <p className="owner-card-subtitle">
              ID клуба: {ownerStats.club_short_id}
            </p>
          )}
          <div className="owner-balance">
            <span>Баланс XTR</span>
            <span className="owner-balance-value" id="owner-balance">
              <img
                src="https://ppnards.ams3.cdn.digitaloceanspaces.com/ppnards/leaderboards/type_params/tg_star.png"
                alt="XTR"
                className="xtr-icon"
              />
              {formatNumber(ownerStats.xtr_balance || 0, 0)}
            </span>
          </div>
          <div className="owner-payments">
            <h3>Последние платежи</h3>
            {ownerStats.payments && ownerStats.payments.length > 0 ? (
              <ul className="owner-payments-list" id="owner-payments-list">
                {ownerStats.payments.map((payment: Payment, index: number) => (
                  <li key={index} className="owner-payment-item">
                    <div className="owner-payment-amount">
                      <img
                        src="https://ppnards.ams3.cdn.digitaloceanspaces.com/ppnards/leaderboards/type_params/tg_star.png"
                        alt="XTR"
                        className="xtr-icon"
                      />
                      {formatNumber(payment.amount || 0, 0)}
                    </div>
                    <div className="owner-payment-meta">
                      <span>
                        {payment.account_short_id
                          ? `ID игрока: ${payment.account_short_id}`
                          : 'ID игрока: —'}
                      </span>
                      <span>{formatDateTime(payment.created_on)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint" id="owner-no-payments">
                Платежи ещё не проводились.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

