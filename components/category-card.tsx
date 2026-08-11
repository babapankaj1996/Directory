import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { categories, iconMap, type Category } from "@/lib/data";

const accents = [
  {
    bar: "from-cyan-400 to-blue-500",
    icon: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    hover: "hover:border-cyan-200 hover:shadow-cyan-900/10",
    meta: "text-cyan-700",
    arrow: "group-hover:text-cyan-700"
  },
  {
    bar: "from-emerald-400 to-teal-500",
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    hover: "hover:border-emerald-200 hover:shadow-emerald-900/10",
    meta: "text-emerald-700",
    arrow: "group-hover:text-emerald-700"
  },
  {
    bar: "from-amber-400 to-orange-500",
    icon: "bg-amber-50 text-amber-700 ring-amber-100",
    hover: "hover:border-amber-200 hover:shadow-amber-900/10",
    meta: "text-amber-700",
    arrow: "group-hover:text-amber-700"
  },
  {
    bar: "from-rose-400 to-pink-500",
    icon: "bg-rose-50 text-rose-700 ring-rose-100",
    hover: "hover:border-rose-200 hover:shadow-rose-900/10",
    meta: "text-rose-700",
    arrow: "group-hover:text-rose-700"
  }
] as const;

function accentFor(slug: string) {
  const index = [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % accents.length;
  return accents[index];
}

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
  const accent = accentFor(category.slug);
  return (
    <Link href={cardHref} className={`group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl ${accent.hover}`}>
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg ring-1 ${accent.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className={`h-5 w-5 text-muted transition group-hover:translate-x-1 ${accent.arrow}`} />
      </div>
      <div className="mt-5 flex items-center gap-2">
        <h3 className="text-base font-semibold text-ink">{category.name}</h3>
        {category.isAdult ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">18+</span> : null}
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{category.description}</p>
      <p className={`mt-4 text-xs font-semibold uppercase tracking-[0.14em] ${accent.meta}`}>{category.count.toLocaleString()} listings</p>
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
