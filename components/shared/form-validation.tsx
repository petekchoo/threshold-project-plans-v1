'use client';

import type { RefObject } from 'react';

export type FieldErrors = Record<string, string>;

const defaultMessage = (field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
  if (field.validity.valueMissing) return 'This field is required.';
  if (field.validity.typeMismatch) return 'Enter a valid value.';
  if (field instanceof HTMLInputElement && field.validity.rangeUnderflow) return `Enter a value of at least ${field.min}.`;
  if (field instanceof HTMLInputElement && field.validity.rangeOverflow) return `Enter a value no greater than ${field.max}.`;
  return field.validationMessage || 'Check this field and try again.';
};

export function nativeFieldErrors(form: HTMLFormElement): FieldErrors {
  const errors: FieldErrors = {};
  const fields = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]');
  fields.forEach(field => {
    if (!field.validity.valid) errors[field.name] = defaultMessage(field);
  });
  return errors;
}

export function focusFirstInvalid(form: HTMLFormElement, errors: FieldErrors) {
  const firstName = Object.keys(errors)[0];
  if (!firstName) return;
  requestAnimationFrame(() => {
    const field = form.elements.namedItem(firstName);
    if (field instanceof HTMLElement) field.focus();
  });
}

export function validationProps(name: string, errors: FieldErrors) {
  const invalid = !!errors[name];
  return {
    'aria-invalid': invalid || undefined,
    'aria-describedby': invalid ? `${name}-error` : undefined,
  } as const;
}

export function RequiredMark() {
  return <span className="required-mark" aria-hidden="true"> *</span>;
}

export function FieldError({ name, errors }: { name: string; errors: FieldErrors }) {
  return errors[name] ? <span className="field-error" id={`${name}-error`}>{errors[name]}</span> : null;
}

export function ErrorSummary({ errors, formRef }: { errors: FieldErrors; formRef: RefObject<HTMLFormElement | null> }) {
  const entries = Object.entries(errors);
  if (!entries.length) return null;
  return <section className="error-summary" role="alert" aria-labelledby="error-summary-title">
    <h3 id="error-summary-title">Check the highlighted fields</h3>
    <ul>{entries.map(([name, message]) => <li key={name}><a href={`#${name}`} onClick={event => {
      event.preventDefault();
      const field = formRef.current?.elements.namedItem(name);
      if (field instanceof HTMLElement) field.focus();
    }}>{message}</a></li>)}</ul>
  </section>;
}
