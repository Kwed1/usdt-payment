import React from 'react';

interface SuccessSectionProps {
  message: string;
  onClose: () => void;
  isActive: boolean;
}

export const SuccessSection: React.FC<SuccessSectionProps> = ({ message, onClose, isActive }) => {
  return (
    <section id="step-success" className={`section ${isActive ? 'active' : ''}`}>
      <div className="card">
        <h2>Успешно зачислено</h2>
        <p className="hint" id="success-message">{message}</p>
      </div>
      <button id="success-close" onClick={onClose}>
        Закрыть
      </button>
    </section>
  );
};

