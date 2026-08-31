'use client';

export function FormActions({ busy, onCancel }: { busy: boolean; onCancel: () => void }) {
  return (
    <div className="form-actions">
      <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
      <button className="create-btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  );
}
