import React from 'react';
import type { ClubInfo } from '../types';

interface FormSectionProps {
  accountShortId: string;
  clubShortId: string;
  accountLocked: boolean;
  clubLocked: boolean;
  clubInfo: ClubInfo | null;
  onAccountChange: (value: string) => void;
  onClubChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  cdnUrl: string;
  isActive: boolean;
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

export const FormSection: React.FC<FormSectionProps> = ({
  accountShortId,
  clubShortId,
  accountLocked,
  clubLocked,
  clubInfo,
  onAccountChange,
  onClubChange,
  onSubmit,
  cdnUrl,
  isActive,
}) => {
  const showClubPreview = clubLocked && clubShortId && clubInfo;
  const logoUrl = clubInfo ? resolveLogoUrl(clubInfo.logo, cdnUrl) : resolveLogoUrl(null, cdnUrl);
  const title = clubInfo?.title || (clubShortId ? `Клуб ${clubShortId}` : '');
  const shortId = clubInfo?.short_id || clubShortId;

  return (
    <section id="step-form" className={`section ${isActive ? 'active' : ''}`}>
      <form id="lookup-form" onSubmit={onSubmit}>
        <div className="card">
          <h2>Данные для проверки</h2>
          {showClubPreview ? (
            <div className="club-preview">
              <img id="club-preview-logo" src={logoUrl} alt={title || 'Логотип клуба'} />
              <div>
                <div className="club-preview-title">{title}</div>
                <div className="club-preview-subtitle">ID клуба: {shortId}</div>
              </div>
            </div>
          ) : (
            <div className="club-preview hidden"></div>
          )}
          <div className="field">
            <label htmlFor="account-input">Ваш ID аккаунта</label>
            <input
              id="account-input"
              inputMode="numeric"
              autoComplete="off"
              required
              placeholder="Например: 12345678"
              value={accountShortId}
              onChange={(e) => onAccountChange(e.target.value)}
              readOnly={accountLocked}
              className={accountLocked ? 'readonly-input' : ''}
            />
            {accountLocked && (
              <p className="hint lock-hint">ID задан ссылкой и не может быть изменён.</p>
            )}
          </div>
          {!clubLocked && (
            <div className="field" id="club-field">
              <label htmlFor="club-input">ID клуба</label>
              <input
                id="club-input"
                inputMode="numeric"
                autoComplete="off"
                required
                placeholder="Например: 87654321"
                value={clubShortId}
                onChange={(e) => onClubChange(e.target.value)}
              />
            </div>
          )}
          {clubLocked && (
            <p className="hint lock-hint">ID клуба задан ссылкой и не может быть изменён.</p>
          )}
          <p className="hint">ID можно посмотреть в профиле игрока и на странице клуба в приложении.</p>
        </div>
        <button type="submit">Проверить и продолжить</button>
      </form>
    </section>
  );
};

