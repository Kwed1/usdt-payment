import React from 'react'
import type { ClubInfo } from '../types'

interface SummarySectionProps {
  selectedAmount: string;
  pricePerChip: number;
  memberBalance: number;
  clubInfo: ClubInfo | null;
  clubMessage: string;
  cdnUrl: string;
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
  isActive: boolean;
}

function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function resolveLogoUrl(raw: string | null | undefined, cdnUrl: string): string {
  const baseCdn = (cdnUrl || 'https://ppnards.ams3.cdn.digitaloceanspaces.com').replace(/\/$/, '');
  const fallback = `${baseCdn}/ppnards/default-avatars/club.png`;
  if (!raw) {
    return fallback;
  }
  if (/^https?:/i.test(raw)) {
    return raw;
  }
  return `${baseCdn}/${raw.replace(/^\//, '')}`;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  selectedAmount,
  pricePerChip,
  memberBalance,
  clubInfo,
  clubMessage,
  cdnUrl,
  onConfirm,
  onBack,
  isLoading,
  isActive,
}) => {
  const amount = parseInt(selectedAmount || '0', 10);
  const price = Math.round(amount * pricePerChip);
  const balanceAfter = memberBalance + amount;

  return (
    <section id="step-summary" className={`section ${isActive ? 'active' : ''}`}>
      <div className="card">
        <h2>Подтверждение</h2>
        {clubInfo && (
          <div className="summary-club">
            <img
              id="summary-club-logo"
              src={resolveLogoUrl(clubInfo.logo, cdnUrl)}
              alt={clubInfo.title || 'Club logo'}
            />
            <div>
              <div className="summary-club-title">{clubInfo.title || 'Клуб'}</div>
              <div className="summary-club-subtitle">
                {clubInfo.short_id ? `ID клуба: ${clubInfo.short_id}` : ''}
              </div>
            </div>
          </div>
        )}
        {clubMessage && (
          <div className="club-message" id="summary-club-message">{clubMessage}</div>
        )}
        <div className="summary">
          <div className="summary-row">
            <span>
              <img
                src="https://ppnards.ams3.cdn.digitaloceanspaces.com/ppnards/leaderboards/type_params/pp_chip.png"
                alt="chip"
                className="chip-icon"
              />
              Фишек к зачислению
            </span>
            <span id="summary-chips" className="amount">
              {formatNumber(amount, 0)}
            </span>
          </div>
          <div className="summary-row">
            <span>
              <img
                src="https://ppnards.ams3.cdn.digitaloceanspaces.com/ppnards/leaderboards/type_params/tg_star.png"
                alt="XTR"
                className="xtr-icon"
              />
              К оплате
            </span>
            <span id="summary-price" className="amount">
              {formatNumber(price, 0)}
            </span>
          </div>
          <div className="summary-row">
            <span>
              <img
                src="https://ppnards.ams3.cdn.digitaloceanspaces.com/ppnards/leaderboards/type_params/pp_chip.png"
                alt="chip"
                className="chip-icon"
              />
              Баланс после
            </span>
            <span id="summary-balance" className="amount">
              {formatNumber(balanceAfter, 0)}
            </span>
          </div>
        </div>
        <p className="hint">Проверьте данные и подтвердите покупку.</p>
      </div>
      {isLoading && (
        <div id="summary-loader" className="loader"></div>
      )}
      <button id="summary-confirm" onClick={onConfirm} disabled={isLoading}>
        Подтвердить покупку
      </button>
      <button
        className="secondary"
        id="summary-back"
        style={{ marginTop: '12px' }}
        onClick={onBack}
      >
        Изменить сумму
      </button>
    </section>
  );
};

