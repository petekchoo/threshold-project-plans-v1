'use client';

export function FormActions({ busy, onCancel, disabled = false }: { busy: boolean; onCancel: () => void; disabled?: boolean }) {
  return (
    <div className="form-actions">
      <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
      <button className="create-btn" disabled={busy || disabled}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  );
}
