import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CategoryListingPage } from "@/components/category-listing-page";
import { buildCategorySeoContent } from "@/lib/category-seo";
import { getActiveCitiesForCountry, getActiveLocation } from "@/lib/locations";
import { getPublicCategories, getPublicCategory, getPublicProfiles } from "@/lib/profiles";
import { breadcrumbJsonLd, categoryCollectionJsonLd, categoryItemListJsonLd, faqJsonLd } from "@/lib/seo-schema";
import { formatRouteName } from "@/lib/utils";

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ country: string; city: string; category: string }>;
  searchParams?: Promise<CategorySearchParams>;
}): Promise<Metadata> {
  const { country, city, category } = await params;
  const query: CategorySearchParams = searchParams ? await searchParams : {};
  const categoryData = await getPublicCategory(category);

  if (!categoryData) {
    return { title: "Category Not Found" };
  }

  const profiles = await getPublicProfiles({ country, city, category, placementPath: `/${country}/${city}/${category}` });
  const seo = buildCategorySeoContent({ country, city, category: categoryData, listings: profiles });

  return {
    title: seo.title,
    description: seo.description,
    keywords: [
      seo.primaryKeyword,
      `${seo.cityName} ${seo.categoryName}`,
      `verified ${seo.categoryName.toLowerCase()} ${seo.cityName}`,
      `${seo.categoryName.toLowerCase()} profiles ${seo.cityName}`,
      `${seo.categoryName.toLowerCase()} near me`
    ],
    alternates: { canonical: `/${country}/${city}/${category}` },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `/${country}/${city}/${category}`,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description
    },
    robots: categoryData.indexable === false || query.search?.trim() || query.page ? { index: false, follow: true, noarchive: Boolean(query.search?.trim() || query.page) } : { index: true, follow: true },
    other: categoryData.isAdult ? { rating: "adult" } : undefined
  };
}

type CategorySearchParams = {
  search?: string;
  page?: string;
};

function parsePage(value?: string) {
  const page = Number(value || 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function cleanPageHref(path: string, page: number, search?: string) {
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const query = params.toString();
  const cleanPath = page > 1 ? `${path}/page/${page}` : path;
  return query ? `${cleanPath}?${query}` : cleanPath;
}

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: Promise<{ country: string; city: string; category: string }>;
  searchParams: Promise<CategorySearchParams>;
}) {
  const { country, city, category } = await params;
  const { search, page } = await searchParams;
  const categoryData = await getPublicCategory(category);
  const location = await getActiveLocation(country, city);

  if (!location || !categoryData) {
    notFound();
  }

  const path = `/${country}/${city}/${category}`;
  const [profiles, activeCategories, activeCities] = await Promise.all([
    getPublicProfiles({ country, city, category, search, placementPath: path }),
    getPublicCategories({ includeAdult: true }),
    getActiveCitiesForCountry(country)
  ]);
  const seo = buildCategorySeoContent({ country, city, category: categoryData, activeCities, categoryOptions: activeCategories, listings: profiles });

  if (page) {
    redirect(cleanPageHref(path, parsePage(page), search));
  }

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: country.toUpperCase(), path: `/${country}` },
      { name: formatRouteName(city), path: `/${country}/${city}` },
      { name: categoryData.name, path }
    ]),
    categoryItemListJsonLd(path, profiles),
    categoryCollectionJsonLd(path, seo, profiles),
    faqJsonLd(seo.faq)
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CategoryListingPage
        country={country}
        city={city}
        categorySlug={category}
        categoryData={categoryData}
        seoContent={seo}
        categoryOptions={activeCategories}
        initialListings={profiles}
        initialSearch={search || ""}
        initialRotationMinute={Math.floor(Date.now() / 60000)}
        initialPage={1}
      />
    </>
  );
}
