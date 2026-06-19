"use client";

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="grim-modal-backdrop" onClick={onCancel}>
      <div className="grim-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <p className="grim-modal-message">{message}</p>
        <div className="grim-modal-actions">
          <button className="grim-btn is-ghost" onClick={onCancel}>Cancel</button>
          <button className="grim-btn is-blood" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
