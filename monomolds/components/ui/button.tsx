import Link from "next/link";
import type { ComponentProps, ComponentPropsWithRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function buttonClasses(variant: Variant = "primary", className = "") {
  return `ui-button ui-button--${variant} ${className}`;
}

// Keep normal button options and add shared styling and loading feedback.
// Loading blocks repeat clicks. A form must explicitly request type="submit".
type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: Variant;
  loading?: boolean;
  loadingLabel?: string;
};

/** Real HTML button with shared variants and a safe loading state. */
export function Button({ variant, loading = false, loadingLabel = "Proszę czekać…", disabled, children, className, type = "button", ...props }: ButtonProps) {
  return (
    <button {...props} type={type} className={buttonClasses(variant, className)} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading ? loadingLabel : children}
    </button>
  );
}

// Use a link to open a page. Use Button for actions that can be disabled.
/** Styled navigation link. Use Button for actions that can be disabled. */
export function LinkButton({ variant, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClasses(variant, className)} />;
}

/** Icon-only button. The label is required for screen readers. */
export function IconButton({ label, ...props }: Omit<ButtonProps, "children" | "aria-label"> & { label: string; children: React.ReactNode }) {
  return <Button {...props} aria-label={label} className={`ui-icon-button ${props.className ?? ""}`} />;
}
