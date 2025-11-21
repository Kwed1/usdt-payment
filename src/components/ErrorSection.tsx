import React from 'react';
import type { Contact } from '../types';

interface ErrorSectionProps {
  message: string;
  contacts: Contact[];
  onRetry: () => void;
  isActive: boolean;
}

export const ErrorSection: React.FC<ErrorSectionProps> = ({ message, contacts, onRetry, isActive }) => {
  return (
    <section id="step-error" className={`section ${isActive ? 'active' : ''}`}>
      <div className="card error-card">
        <h2>Пополнение недоступно</h2>
        <p id="error-message" className="hint">{message}</p>
        {contacts.length > 0 && (
          <div id="error-contacts" className="contacts">
            {contacts.map((contact, index) => {
              const content = (
                <>
                  <span>{contact.label}</span>
                  <strong>{contact.value || ''}</strong>
                </>
              );
              
              if (contact.link) {
                return (
                  <a
                    key={index}
                    href={contact.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-link"
                  >
                    {content}
                  </a>
                );
              }
              
              return (
                <div key={index} className="contact-link">
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button className="secondary" id="error-retry" onClick={onRetry}>
        Вернуться назад
      </button>
    </section>
  );
};

