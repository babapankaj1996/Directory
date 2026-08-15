export function PageHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && (
        <p className="inline-flex items-center gap-2.5 text-2xs font-bold uppercase tracking-[0.2em] text-copper-700">
          <span aria-hidden="true" className="h-px w-8 bg-copper-500" />
          {eyebrow}
          <span aria-hidden="true" className="h-px w-8 bg-copper-500" />
        </p>
      )}
      <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-ink md:text-6xl">
        {title}
      </h1>
      {description && <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-ink-muted md:text-lg">{description}</p>}
    </div>
  );
}
