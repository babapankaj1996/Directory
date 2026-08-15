import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { categories, iconMap, type Category } from "@/lib/data";

export function CategoryCard({
  category,
  city = "delhi",
  country = "in",
  href
}: {
  category: Category;
  country?: string;
  city?: string;
  href?: string;
}) {
  const Icon = iconMap[category.iconName as keyof typeof iconMap] || iconMap.Home;
  const cardHref = href || `/${country}/${city}/${category.slug}`;

  return (
    <Link
      href={cardHref}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-xs transition-all duration-300 ease-entrance hover:-translate-y-0.5 hover:border-copper-500/50 hover:shadow-lift"
    >
      {/* Warm wash that only appears on hover — one accent, not four. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-copper-50/0 via-copper-50/0 to-copper-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-100 text-ink transition-colors duration-300 group-hover:bg-ink group-hover:text-copper-300">
          <Icon className="h-[1.15rem] w-[1.15rem]" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-stone-400 transition-all duration-300 ease-entrance group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-copper-600" />
      </div>

      <div className="relative mt-6 flex items-center gap-2">
        <h3 className="text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">{category.name}</h3>
        {category.isAdult ? (
          <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[0.625rem] font-bold text-gold-800">18+</span>
        ) : null}
      </div>
      <p className="relative mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">{category.description}</p>

      <p className="relative mt-5 flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.16em] text-ink-muted">
        <span className="h-px w-5 bg-copper-600 transition-all duration-300 group-hover:w-8" aria-hidden="true" />
        {category.count.toLocaleString()} listing{category.count === 1 ? "" : "s"}
      </p>
    </Link>
  );
}

export function CategoryGrid({
  items = categories,
  country = "in",
  city = "delhi",
  hrefForCategory
}: {
  items?: Category[];
  country?: string;
  city?: string;
  hrefForCategory?: (category: Category) => string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((category) => (
        <CategoryCard
          key={category.slug}
          category={category}
          country={country}
          city={city}
          href={hrefForCategory?.(category)}
        />
      ))}
    </div>
  );
}
