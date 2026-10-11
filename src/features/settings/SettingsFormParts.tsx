'use client';
import { useId, type InputHTMLAttributes } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export function SettingsField({
  label,
  hint,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  invalid?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="settings-field">
      <label htmlFor={id}>{label}</label>
      <Input
        {...props}
        id={id}
        invalid={invalid}
        aria-describedby={hint ? hintId : undefined}
        className="settings-form-input"
      />
      {hint && (
        <p id={hintId} className={invalid ? 'settings-error' : 'settings-hint'}>
          {hint}
        </p>
      )}
    </div>
  );
}
export function SettingsError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="settings-error">
      {message}
    </p>
  ) : null;
}
export function SettingsFormActions({
  onCancel,
  label,
  disabled,
  pending,
}: {
  onCancel: () => void;
  label: string;
  disabled: boolean;
  pending: boolean;
}) {
  return (
    <div className="settings-form-actions">
      <Button
        variant="secondary"
        onClick={onCancel}
        disabled={pending}
        className="settings-cancel"
      >
        취소
      </Button>
      <Button type="submit" disabled={disabled} loading={pending}>
        {label}
      </Button>
    </div>
  );
}
