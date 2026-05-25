import { redirect } from "next/navigation";
import {
  ListingsPageContent,
  listingsHref,
  listingsMetadata,
  parseFilters,
  parseListingsPage,
  type ListingSearchParams
} from "@/app/listings/listings-page-content";
import { cleanListingsRouteForFilters } from "@/lib/listings-routes";

export async function generateMetadata({ searchParams }: { searchParams: Promise<ListingSearchParams> }) {
  const params = await searchParams;
  return listingsMetadata(parseListingsPage(params.page), parseFilters(params));
}

export default async function ListingsPage({ searchParams }: { searchParams: Promise<ListingSearchParams> }) {
  const params = await searchParams;
  const page = parseListingsPage(params.page);
  const filters = parseFilters(params);
  const cleanRoute = cleanListingsRouteForFilters(filters);

  if (cleanRoute) {
    redirect(cleanRoute);
  }

  if (params.page) {
    redirect(listingsHref(page, filters));
  }

  return <ListingsPageContent page={1} filters={filters} />;
}
