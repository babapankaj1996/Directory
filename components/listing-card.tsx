import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Eye, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { featuredDaysRemaining, isFeaturedActive, isIdVerifiedListing, type Listing } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { SaveProfileButton } from "@/components/save-profile-button";

export function ListingCard({
  listing,
  horizontal = false,
  featuredContact = false,
  priority = false,
  placementPath
}: {
  listing: Listing;
  horizontal?: boolean;
  featuredContact?: boolean;
  priority?: boolean;
  placementPath?: string;
}) {
  const href = `/${listing.country}/${listing.city}/${listing.categorySlug}/${listing.slug}`;
  const activeFeatured = isFeaturedActive(listing, Date.now(), placementPath);
  const featuredDays = featuredDaysRemaining(listing, Date.now(), placementPath);
  const idVerified = isIdVerifiedListing(listing);
  const phoneHref = listing.phone ? `tel:${listing.phone.replace(/\s+/g, "")}` : "";
  const whatsapp = (listing.whatsapp || listing.phone || "").replace(/\D/g, "");
  const buttonSize = horizontal ? "sm" : "sm";

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-surface transition-all duration-300 ease-entrance hover:-translate-y-0.5 hover:shadow-lift ${
        activeFeatured ? "border-copper-500/45" : "border-line shadow-xs"
      } ${horizontal ? "sm:grid sm:grid-cols-[190px_minmax(0,1fr)] md:grid-cols-[248px_1fr]" : ""}`}
    >
      <div
        className={`relative overflow-hidden bg-sunken ${
          horizontal ? "aspect-[16/9] sm:aspect-auto sm:h-full sm:min-h-[196px]" : "aspect-[4/3]"
        }`}
      >
        <Link href={href} className="absolute inset-0 block" tabIndex={-1} aria-hidden="true">
          <Image
            src={listing.image}
            alt=""
            fill
            priority={priority}
            fetchPriority={priority ? "high" : undefined}
            quality={priority ? 65 : 70}
            className="object-cover transition-transform duration-500 ease-entrance group-hover:scale-[1.04]"
            sizes={horizontal ? "(max-width: 640px) 100vw, (max-width: 768px) 190px, 248px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
          />
        </Link>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-shade/70 via-shade/10 to-transparent" aria-hidden="true" />

        {activeFeatured ? (
          <span className="absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 truncate rounded-full bg-shade/80 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-copper-700 backdrop-blur">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-copper-600" aria-hidden="true" />
            {featuredDays ? `Featured · ${featuredDays}d` : "Featured"}
          </span>
        ) : null}

        <SaveProfileButton
          profileId={listing.id || listing.slug}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-shade/70 text-white shadow-sm backdrop-blur transition-colors hover:bg-shade hover:text-clay-600"
          savedClassName="bg-clay-600 text-white hover:text-white"
        />
      </div>

      <div className={`flex min-w-0 flex-1 flex-col ${horizontal ? "p-4 md:p-5" : "p-5"}`}>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-copper-700">
          {listing.category}
          {listing.isAdult ? (
            <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[0.625rem] tracking-normal text-gold-700">18+</span>
          ) : null}
          {listing.isAdult ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[0.625rem] tracking-normal ${
                idVerified ? "bg-jade-100 text-jade-700" : "bg-clay-100 text-clay-700"
              }`}
            >
              {idVerified ? "ID verified" : "Not verified"}
            </span>
          ) : null}
        </p>

        <h3 className={`mt-2 min-w-0 font-display font-semibold leading-tight tracking-[-0.02em] text-ink ${horizontal ? "text-lg md:text-xl" : "text-xl"}`}>
          <Link href={href} className="inline-flex items-start gap-1.5 transition-colors duration-200 hover:text-copper-700 after:absolute after:inset-0 after:content-['']">
            <span className="line-clamp-2">{listing.name}</span>
            {idVerified ? <BadgeCheck className="mt-1 h-[1.05rem] w-[1.05rem] shrink-0 text-jade-600" aria-label="Verified" /> : null}
          </Link>
        </h3>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] text-ink-muted">
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <Star className="h-3.5 w-3.5 fill-gold-600 text-gold-600" aria-hidden="true" />
            {listing.rating}
            <span className="font-normal text-ink-muted">({listing.reviews})</span>
          </span>
          <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{listing.location}</span>
          </span>
          <span aria-hidden="true" className="hidden h-3 w-px bg-line-strong sm:block" />
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" /> {listing.viewCount.toLocaleString()}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-muted">{listing.about}</p>

        <div className="relative z-10 mt-auto flex flex-wrap gap-2 pt-4">
          <Button href={href} variant="primary" size={buttonSize}>View profile</Button>
          {activeFeatured && featuredContact ? (
            <>
              {phoneHref ? (
                <Button href={phoneHref} variant="ghost" size={buttonSize} aria-label={`Call ${listing.name}`}>
                  <Phone className="h-3.5 w-3.5 text-jade-600" /> Call
                </Button>
              ) : null}
              {whatsapp ? (
                <Button href={`https://wa.me/${whatsapp}`} variant="ghost" size={buttonSize} aria-label={`WhatsApp ${listing.name}`}>
                  <MessageCircle className="h-3.5 w-3.5 text-moss-600" /> WhatsApp
                </Button>
              ) : null}
            </>
          ) : (
            <Button href="/login" variant="ghost" size={buttonSize}>Request service</Button>
          )}
        </div>
      </div>
    </article>
  );
}
