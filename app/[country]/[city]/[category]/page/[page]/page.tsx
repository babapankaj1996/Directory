import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CategoryListingPage } from "@/components/category-listing-page";
import { getCitiesForCountry, publicCountries } from "@/lib/data";
import { buildCategorySeoContent } from "@/lib/category-seo";
import { getPublicCategories, getPublicCategory, getPublicProfiles } from "@/lib/profiles";
import { breadcrumbJsonLd, categoryCollectionJsonLd, categoryItemListJsonLd } from "@/lib/seo-schema";
import { formatRouteName } from "@/lib/utils";

const perPage = 20;

type CategoryPageParams = {
  country: string;
  city: string;
  category: string;
  page: string;
};

type CategorySearchParams = {
  search?: string;
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

export async function generateMetadata({
  params
}: {
  params: Promise<CategoryPageParams>;
}): Promise<Metadata> {
  const { country, city, category, page } = await params;
  const categoryData = await getPublicCategory(category);

  if (!categoryData) {
    return { title: "Category Not Found" };
  }

  const pageNumber = parsePage(page);
  const seo = buildCategorySeoContent({ country, city, category: categoryData });
  const title = `${seo.title} - Page ${pageNumber}`;
  const description = `Browse more ${seo.categoryName.toLowerCase()} profiles in ${seo.cityName}, ${seo.countryName}. Compare services, ratings, gallery details, pricing notes, availability and contact options before booking.`;

  return {
    title,
    description,
    alternates: { canonical: `/${country}/${city}/${category}` },
    openGraph: { title, description, url: `/${country}/${city}/${category}` },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: false, follow: true, noarchive: true },
    other: categoryData.isAdult ? { rating: "adult" } : undefined
  };
}

export default async function CleanCategoryPage({
  params,
  searchParams
}: {
  params: Promise<CategoryPageParams>;
  searchParams: Promise<CategorySearchParams>;
}) {
  const { country, city, category, page: pageParam } = await params;
  const { search } = await searchParams;
  const page = parsePage(pageParam);
  const categoryData = await getPublicCategory(category);

  if (!publicCountries.some((item) => item.code === country) || !getCitiesForCountry(country).some((item) => item.slug === city) || !categoryData) {
    notFound();
  }

  const path = `/${country}/${city}/${category}`;
  if (page <= 1) {
    redirect(cleanPageHref(path, 1, search));
  }

  const [profiles, activeCategories] = await Promise.all([
    getPublicProfiles({ country, city, category, search }),
    getPublicCategories({ includeAdult: true })
  ]);
  const seo = buildCategorySeoContent({ country, city, category: categoryData, categoryOptions: activeCategories, listings: profiles });
  const totalPages = Math.max(Math.ceil(profiles.length / perPage), 1);
  if (page > totalPages) {
    redirect(cleanPageHref(path, totalPages, search));
  }

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: country.toUpperCase(), path: `/${country}` },
      { name: formatRouteName(city), path: `/${country}/${city}` },
      { name: categoryData.name, path }
    ]),
    categoryItemListJsonLd(cleanPageHref(path, page, search), profiles.slice((page - 1) * perPage, page * perPage)),
    categoryCollectionJsonLd(cleanPageHref(path, page, search), seo, profiles.slice((page - 1) * perPage, page * perPage))
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
        initialPage={page}
      />
    </>
  );
}
