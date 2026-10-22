"use client";

import { useState } from "react";

import { isPhoneCountryCode, PHONE_COUNTRIES, type PhoneCountryCode } from "./phone";

type PhoneNumberFieldProps = {
  id: string;
  label: string;
  nationalNumberName: string;
  countryCodeName?: string;
  hint?: string;
  error?: string;
  required?: boolean;
};

export function PhoneNumberField({
  id,
  label,
  nationalNumberName,
  countryCodeName = "phoneCountryCode",
  hint,
  error,
  required = true,
}: PhoneNumberFieldProps) {
  const [countryCode, setCountryCode] = useState<PhoneCountryCode>("PL");
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="ui-field phone-number-field">
      <label htmlFor={id}>
        {label}{required ? <span className="ui-field-note"> (wymagane)</span> : null}
      </label>
      <div className="phone-number-control">
        <select
          name={countryCodeName}
          className="ui-input phone-country"
          aria-label="Kraj i numer kierunkowy"
          autoComplete="tel-country-code"
          value={countryCode}
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (isPhoneCountryCode(value)) setCountryCode(value);
          }}
        >
          {PHONE_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} +{country.callingCode}
            </option>
          ))}
        </select>
        <input
          id={id}
          name={nationalNumberName}
          className="ui-input phone-national-number"
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined}
        />
      </div>
      {hint ? <p id={hintId} className="ui-field-note">{hint}</p> : null}
      {error ? <p id={errorId} className="ui-field-error">{error}</p> : null}
    </div>
  );
}
