import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  isOpen?: boolean;
  onClose: () => void;
  children: ReactNode;
  showDefaultFooter?: boolean;
}

export function Modal({ title, isOpen = true, onClose, children, showDefaultFooter = false }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        {children}
        {showDefaultFooter && (
          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
