export function PageHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && <p className="text-sm font-bold uppercase tracking-[0.28em] text-champagne">{eyebrow}</p>}
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink md:text-6xl">{title}</h1>
      {description && <p className="mt-5 text-base leading-8 text-muted md:text-lg">{description}</p>}
    </div>
  );
}
