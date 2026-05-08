import React, { useEffect, useRef } from 'react';
import { createModal } from 'impeccable';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const impeccableInstance = useRef<any>(null);

  useEffect(() => {
    if (modalRef.current && !impeccableInstance.current) {
      impeccableInstance.current = createModal(modalRef.current, {
        onClose: onClose
      });
    }
  }, [onClose]);

  useEffect(() => {
    if (impeccableInstance.current) {
      if (isOpen) {
        impeccableInstance.current.show();
      } else {
        impeccableInstance.current.hide();
      }
    }
  }, [isOpen]);

  return (
    <div ref={modalRef} className="impeccable-modal" aria-hidden="true">
      <div className="modal-overlay" tabindex="-1" data-impeccable-close>
        <div className="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <header>
            <h2 id="modal-title">{title}</h2>
            <button aria-label="Close modal" data-impeccable-close>✕</button>
          </header>
          <main>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};