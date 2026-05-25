import { getApprovedListings, isFeaturedActive, sortByFeaturedVisibility, type Listing } from "@/lib/data";
import { ListingCard } from "@/components/listing-card";

export function ListingGridSection({ title = "Featured profiles", listings }: { title?: string; listings?: Listing[] }) {
  const pool = listings?.length ? listings : getApprovedListings();
  const featured = sortByFeaturedVisibility(pool.filter((listing) => isFeaturedActive(listing))).slice(0, 3);
  const visibleListings = featured.length ? featured : sortByFeaturedVisibility(pool).slice(0, 3);
  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-champagne">Verified & premium</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-4xl">{title}</h2>
        </div>
      </div>
      <div className="grid gap-5">
        {visibleListings.map((listing) => (
          <ListingCard key={listing.slug} listing={listing} horizontal featuredContact />
        ))}
      </div>
    </section>
  );
}
