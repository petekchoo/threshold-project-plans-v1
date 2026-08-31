import type { KeyboardEvent } from 'react';

export function handleModalKeyDown(
  event: KeyboardEvent<HTMLElement>,
  { onSave, onCancel, canSave = true }: { onSave: () => void; onCancel: () => void; canSave?: boolean },
) {
  if (event.nativeEvent.isComposing) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onCancel();
    return;
  }

  const target = event.target;
  if (
    event.key === 'Enter' &&
    !(target instanceof HTMLTextAreaElement) &&
    !(target instanceof HTMLButtonElement)
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    if (canSave) onSave();
  }
}
