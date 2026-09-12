export default function BundlesLoading() {
  return (
    <div className="site-container py-12 sm:py-20" aria-busy="true" aria-live="polite">
      <p className="eyebrow">Mono Molds</p>
      <h1 className="mt-5 text-4xl font-medium tracking-tight sm:text-6xl">Ładowanie zestawów...</h1>
      <div className="ui-product-grid" aria-hidden="true">
        {[1, 2, 3].map((item) => <div key={item} className="aspect-[4/5] animate-pulse rounded-2xl bg-[var(--surface)]" />)}
      </div>
    </div>
  );
}
