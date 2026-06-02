import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { CategoryListingExplorer } from "@/components/category-listing-explorer";
import { getActiveCountry } from "@/lib/locations";
import { getPublicCategory, getPublicProfiles } from "@/lib/profiles";

const perPage = 20;

type CategoryRouteProps = {
  params: Promise<{ country: string; page: string }>;
};

function parsePage(value?: string) {
  const page = Number(value || 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function generateMetadata({ params }: CategoryRouteProps): Promise<Metadata> {
  const { country: segment, page } = await params;
  if (await getActiveCountry(segment)) notFound();
  const category = await getPublicCategory(segment);
  if (!category) notFound();
  const pageNumber = parsePage(page);

  return {
    title: `${category.name} Directory - Page ${pageNumber}`,
    description: `Browse more ${category.name.toLowerCase()} profiles across available cities. Compare services, reviews, gallery media, pricing notes, availability and contact options before you connect.`,
    alternates: { canonical: `/${segment}` },
    openGraph: {
      title: `${category.name} Directory - Page ${pageNumber}`,
      description: `Compare ${category.name.toLowerCase()} providers by location, services, ratings, availability and profile details.`,
      url: `/${segment}`
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} Directory - Page ${pageNumber}`,
      description: `Compare ${category.name.toLowerCase()} providers by location, services, ratings, availability and profile details.`
    },
    robots: { index: false, follow: true, noarchive: true },
    other: category.isAdult ? { rating: "adult" } : undefined
  };
}

export default async function CleanGlobalCategoryPage({ params }: CategoryRouteProps) {
  const { country: segment, page: pageParam } = await params;
  if (await getActiveCountry(segment)) notFound();
  const category = await getPublicCategory(segment);
  if (!category) notFound();
  const page = parsePage(pageParam);

  if (page <= 1) {
    redirect(`/${category.slug}`);
  }

  const listings = await getPublicProfiles({ category: category.slug });
  const totalPages = Math.max(Math.ceil(listings.length / perPage), 1);

  if (page > totalPages) {
    redirect(totalPages > 1 ? `/${category.slug}/page/${totalPages}` : `/${category.slug}`);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-champagne">Category directory</p>
            {category.isAdult ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">18+</span> : null}
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">{category.name} listings</h1>
          <p className="mt-4 max-w-3xl leading-7 text-muted">
            Browse additional {category.name.toLowerCase()} profiles across available countries and cities. Compare service details, reviews, pricing notes, gallery media and availability before you contact or book.
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm ring-1 ring-slate-200">
          <MapPin className="mr-2 inline h-4 w-4 text-champagne" />
          Page {page} of {totalPages}
        </div>
      </div>
      <CategoryListingExplorer category={category} listings={listings} initialPage={page} />
    </main>
  );
}
