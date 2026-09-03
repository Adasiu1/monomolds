import type { ComponentPropsWithRef, ReactNode } from "react";

type FieldProps = { id: string; label: string; hint?: string; error?: string };

// Connect each field to its help and error text so screen readers can read both.
function descriptionIds({ id, hint, error }: FieldProps, extra?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`, extra].filter(Boolean).join(" ") || undefined;
}

// Shared frame: label above, input in the middle, help and errors below.
// The page using the field decides when a value is valid.
function Field({ id, label, hint, error, required, children }: FieldProps & { required?: boolean; children: ReactNode }) {
  return <div className="ui-field">
    <label htmlFor={id}>{label}{required ? <span className="ui-field-note"> (wymagane)</span> : null}</label>
    {children}
    {hint ? <p id={`${id}-hint`} className="ui-field-note">{hint}</p> : null}
    {error ? <p id={`${id}-error`} className="ui-field-error">{error}</p> : null}
  </div>;
}

/** Single-line input with a visible label and connected help/error text. */
export function TextField({ id, label, hint, error, className = "", ...props }: FieldProps & ComponentPropsWithRef<"input">) {
  const field = { id, label, hint, error };
  return <Field {...field} required={props.required}>
    <input {...props} id={id} className={`ui-input ${className}`} aria-invalid={error ? true : props["aria-invalid"]} aria-describedby={descriptionIds(field, props["aria-describedby"])} />
  </Field>;
}

/** Multi-line input using the same accessible field pattern. */
export function TextArea({ id, label, hint, error, className = "", ...props }: FieldProps & ComponentPropsWithRef<"textarea">) {
  const field = { id, label, hint, error };
  return <Field {...field} required={props.required}>
    <textarea rows={4} {...props} id={id} className={`ui-input ${className}`} aria-invalid={error ? true : props["aria-invalid"]} aria-describedby={descriptionIds(field, props["aria-describedby"])} />
  </Field>;
}

/** Native select field. The parent supplies its options. */
export function SelectField({ id, label, hint, error, className = "", children, ...props }: FieldProps & ComponentPropsWithRef<"select">) {
  const field = { id, label, hint, error };
  return <Field {...field} required={props.required}>
    <select {...props} id={id} className={`ui-input ${className}`} aria-invalid={error ? true : props["aria-invalid"]} aria-describedby={descriptionIds(field, props["aria-describedby"])}>{children}</select>
  </Field>;
}

/** Checkbox with a comfortable label target for touch devices. */
export function Checkbox({ id, label, hint, error, className = "", ...props }: FieldProps & Omit<ComponentPropsWithRef<"input">, "type">) {
  const field = { id, label, hint, error };
  return <div className="ui-field">
    <label className={`ui-checkbox ${className}`} htmlFor={id}>
      <input {...props} id={id} type="checkbox" aria-invalid={error ? true : props["aria-invalid"]} aria-describedby={descriptionIds(field, props["aria-describedby"])} />
      <span>{label}{props.required ? " (wymagane)" : ""}</span>
    </label>
    {hint ? <p className="ui-field-note" id={`${id}-hint`}>{hint}</p> : null}
    {error ? <p className="ui-field-error" id={`${id}-error`}>{error}</p> : null}
  </div>;
}
