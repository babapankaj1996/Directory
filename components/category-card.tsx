import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
    <Link href={cardHref} className="glass group rounded-[1.6rem] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-champagne shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-5 w-5 text-muted transition group-hover:translate-x-1 group-hover:text-champagne" />
      </div>
      <div className="mt-5 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-ink">{category.name}</h3>
        {category.isAdult ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">18+</span> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{category.description}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-champagne">{category.count.toLocaleString()} listings</p>
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
