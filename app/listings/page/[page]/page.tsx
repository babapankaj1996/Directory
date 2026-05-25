import { redirect } from "next/navigation";
import {
  ListingsPageContent,
  listingsHref,
  listingsMetadata,
  paginatedRobots,
  parseFilters,
  parseListingsPage,
  type ListingSearchParams
} from "@/app/listings/listings-page-content";
import { cleanListingsRouteForFilters } from "@/lib/listings-routes";

type CleanListingsPageProps = {
  params: Promise<{ page: string }>;
  searchParams: Promise<ListingSearchParams>;
};

export async function generateMetadata({ params, searchParams }: CleanListingsPageProps) {
  const [{ page }, query] = await Promise.all([params, searchParams]);
  return {
    ...listingsMetadata(parseListingsPage(page), parseFilters(query)),
    robots: paginatedRobots
  };
}

export default async function CleanListingsPage({ params, searchParams }: CleanListingsPageProps) {
  const [{ page: pageParam }, query] = await Promise.all([params, searchParams]);
  const page = parseListingsPage(pageParam);
  const filters = parseFilters(query);
  const cleanRoute = cleanListingsRouteForFilters(filters);

  if (cleanRoute) {
    redirect(cleanRoute);
  }

  if (page <= 1) {
    redirect(listingsHref(1, filters));
  }

  return <ListingsPageContent page={page} filters={filters} />;
}
