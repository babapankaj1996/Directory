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
  const compactButtonClass = horizontal ? "px-3 py-2 text-xs md:px-5 md:py-2.5 md:text-sm" : "py-2.5";

  return (
    <article className={`glass group overflow-hidden rounded-[1.35rem] transition duration-300 hover:-translate-y-1 hover:shadow-glow md:rounded-[1.8rem] ${activeFeatured ? "ring-1 ring-amber-200" : ""} ${horizontal ? "grid grid-cols-[minmax(120px,38%)_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)] md:grid-cols-[240px_1fr]" : ""}`}>
      <div className={`relative overflow-hidden ${horizontal ? "h-full min-h-[184px]" : "h-52"}`}>
        <Link href={href} className="absolute inset-0 block">
          <Image src={listing.image} alt={listing.name} fill priority={priority} className="object-cover transition duration-500 group-hover:scale-105" sizes={horizontal ? "(max-width: 640px) 38vw, (max-width: 768px) 180px, 240px" : "(max-width: 768px) 100vw, 33vw"} />
        </Link>
        {activeFeatured && <span className={`absolute rounded-full bg-white/90 font-bold text-champagne backdrop-blur-xl ${horizontal ? "left-2 top-2 max-w-[88px] truncate px-2 py-1 text-[10px] md:left-4 md:top-4 md:max-w-none md:px-3 md:text-xs" : "left-4 top-4 px-3 py-1 text-xs"}`}>{featuredDays ? `Featured ${featuredDays}d` : "Featured"}</span>}
      </div>
      <div className={`min-w-0 ${horizontal ? "p-3 sm:p-4 md:p-5" : "p-5"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href} className={`flex min-w-0 items-center gap-2 font-semibold text-ink hover:text-champagne ${horizontal ? "text-base leading-snug md:text-lg" : "text-lg"}`}>
              <span className="line-clamp-2 min-w-0">{listing.name}</span>
              {idVerified && <BadgeCheck className="h-5 w-5 shrink-0 text-blue-500" />}
            </Link>
            <div className={`mt-1 flex flex-wrap gap-2 text-muted ${horizontal ? "text-xs md:text-sm" : "text-sm"}`}>
              <span>{listing.category}</span>
              {listing.isAdult ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">18+</span> : null}
              {listing.isAdult ? <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${idVerified ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>{idVerified ? "ID verified" : "Not verified"}</span> : null}
            </div>
          </div>
          <SaveProfileButton
            profileId={listing.id || listing.slug}
            className={`flex shrink-0 items-center justify-center rounded-full bg-white/85 text-rose-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-white ${horizontal ? "h-9 w-9 md:h-10 md:w-10" : "h-10 w-10"}`}
            savedClassName="bg-rose-50 text-rose-600"
          />
        </div>
        <div className={`mt-3 flex flex-wrap items-center gap-2 text-muted md:mt-4 md:gap-3 ${horizontal ? "text-xs md:text-sm" : "text-sm"}`}>
          <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-champagne text-champagne" /> {listing.rating} ({listing.reviews})</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> {listing.viewCount.toLocaleString()} views</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {listing.location}</span>
        </div>
        <p className={`${horizontal ? "mt-3 hidden text-sm leading-6 text-muted sm:line-clamp-2 md:mt-4" : "mt-4 line-clamp-2 text-sm leading-6 text-muted"}`}>{listing.about}</p>
        <div className={`flex flex-wrap gap-2 ${horizontal ? "mt-3 md:mt-5" : "mt-5"}`}>
          <Button href={href} variant="gold" className={compactButtonClass}>View Profile</Button>
          {activeFeatured && featuredContact ? (
            <>
              {phoneHref ? <Button href={phoneHref} variant="ghost" className={`bg-blue-600 text-white ring-blue-200 hover:bg-blue-700 hover:text-white focus:ring-blue-200 ${compactButtonClass}`}><Phone className="mr-1.5 h-4 w-4 md:mr-2" /> Call</Button> : null}
              {whatsapp ? <Button href={`https://wa.me/${whatsapp}`} variant="ghost" className={`bg-emerald-700 text-white ring-emerald-200 hover:bg-emerald-800 hover:text-white focus:ring-emerald-200 ${compactButtonClass}`}><MessageCircle className="mr-1.5 h-4 w-4 md:mr-2" /> WhatsApp</Button> : null}
            </>
          ) : (
            <Button href="/login" variant="ghost" className={compactButtonClass}>Request Service</Button>
          )}
        </div>
      </div>
    </article>
  );
}
