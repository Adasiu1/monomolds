import type { ReactNode } from "react";

type Tone = "info" | "success" | "error";
const icons: Record<Tone, string> = { info: "i", success: "✓", error: "!" };

// Notices can read updates aloud through a screen reader. Disable this for static examples.
// For updates, keep the message area on the page and change the text inside it.
export function Notice({ tone = "info", title, children, announce = true }: { tone?: Tone; title: string; children?: ReactNode; announce?: boolean }) {
  return <div className={`ui-notice ui-notice--${tone}`} role={announce ? (tone === "error" ? "alert" : "status") : undefined} aria-atomic={announce || undefined}>
    <span className="ui-notice-icon" aria-hidden="true">{icons[tone]}</span>
    <div><p className="ui-notice-title">{title}</p>{children ? <div className="ui-notice-body">{children}</div> : null}</div>
  </div>;
}

/** Explains why content is missing and offers one recovery action. */
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="ui-empty"><h2>{title}</h2><div className="ui-muted">{children}</div>{action}</div>;
}

// Empty shapes reserve room while products load. Screen readers skip these shapes.
export function ProductCardSkeleton() {
  return <div className="ui-product-card" aria-hidden="true"><div className="ui-skeleton ui-product-media" /><div className="ui-skeleton ui-skeleton-line" /><div className="ui-skeleton ui-skeleton-line ui-skeleton-short" /></div>;
}

/** Keeps a status message available while a page replaces its content with skeletons. */
export function LoadingState({ label = "Wczytujemy produkty…", children }: { label?: string; children?: ReactNode }) {
  return <div><p role="status" className="ui-muted">{label}</p><div aria-busy="true">{children}</div></div>;
}
