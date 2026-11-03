"use client"

export default function MobileProNotice({ onBack }: { onBack: () => void }) {
  return <section className="mx-auto mt-4 w-full max-w-xl rounded-2xl border border-[var(--pf-border)] bg-[var(--pf-card)] px-6 py-10 text-center shadow-xl" aria-labelledby="mobile-pro-title">
    <h1 id="mobile-pro-title" className="text-2xl font-semibold text-[var(--pf-headline)]">Modo Pro está optimizado para escritorio.</h1>
    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--pf-secondary)]">Usa PixelFM desde una pantalla más grande para trabajar escena por escena.</p>
    <button type="button" onClick={onBack} className="mt-7 min-h-11 rounded-xl border border-[var(--pf-selected-border)] bg-[var(--pf-selected)] px-5 text-sm font-semibold text-[var(--pf-headline)] hover:bg-[var(--pf-elevated)]">Volver a Simple</button>
  </section>
}
