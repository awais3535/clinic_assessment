import { cloneElement, useEffect, useId, useRef } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, LoaderCircle, Plus, X } from 'lucide-react';
export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Badge({ value }) {
  return (
    <span className={`badge ${value}`}>
      <span />
      {value}
    </span>
  );
}
export function Notice({ message, type = 'error', onClose }) {
  if (!message) return null;
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`notice ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} />
      <span>{message}</span>
      {onClose && (
        <button className="icon-button" onClick={onClose} aria-label="Dismiss notification">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" size={28} />
      <p>Loading your clinic data…</p>
    </div>
  );
}
export function Empty({ title, description, action }) {
  return (
    <div className="state">
      <div className="empty-icon">
        <CalendarDays size={28} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function AddButton({ children, ...props }) {
  return (
    <Button {...props}>
      <Plus size={18} />
      {children}
    </Button>
  );
}
export function Field({ label, error, children, className = '', hint }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <small id={`${id}-hint`} className="muted">
          {hint}
        </small>
      )}
      {error && (
        <small id={`${id}-error`} className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
export function Modal({ title, subtitle, children, onClose, busy = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={busy}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function ConfirmDelete({ label, onClose, onConfirm, busy, error }) {
  return (
    <Modal
      title="Delete this record?"
      subtitle="This action cannot be undone."
      onClose={onClose}
      busy={busy}
    >
      <p className="confirm-copy">
        You are about to permanently delete <strong>{label}</strong>.
      </p>
      <Notice message={error} />
      <div className="form-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Keep record
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete record'}
        </Button>
      </div>
    </Modal>
  );
}
