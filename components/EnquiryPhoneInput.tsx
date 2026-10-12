"use client";

import { useId, useState, type ChangeEventHandler } from "react";
import { getPhoneError, PHONE_HINT } from "@/lib/phone-validation";

export function EnquiryPhoneInput({ label = "Phone number (required)", value, onChange, error = "" }: {
  label?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  error?: string;
}) {
  const id = useId();
  const [localError, setLocalError] = useState("");
  const message = localError || error;
  return <label>{label}
    <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={60}
      value={value} aria-invalid={Boolean(message)} aria-describedby={`${id}-hint${message ? ` ${id}-error` : ""}`}
      onChange={event => {
        const nextError = getPhoneError(event.currentTarget.value);
        event.currentTarget.setCustomValidity(nextError);
        setLocalError(current => current ? nextError : "");
        onChange?.(event);
      }}
      onBlur={event => {
        const nextError = getPhoneError(event.currentTarget.value);
        event.currentTarget.setCustomValidity(nextError);
        setLocalError(nextError);
      }}
      onInvalid={event => {
        const nextError = getPhoneError(event.currentTarget.value);
        event.currentTarget.setCustomValidity(nextError);
        setLocalError(nextError);
      }} />
    <small id={`${id}-hint`}>{PHONE_HINT}</small>
    {message && <span id={`${id}-error`} className="field-error" role="alert">{message}</span>}
  </label>;
}
