import Link from "next/link";
import { Diamond } from "lucide-react";

export function Footer() {
  return (
    <footer className="mx-auto mt-10 max-w-7xl px-4 pb-8">
      <div className="glass rounded-[2rem] p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-champagne shadow-glow">
            <Diamond className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-ink">Luxury Directory</p>
            <p className="text-sm text-muted">Verified service providers, reviews, prices, availability and booking enquiries.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-6 text-sm text-muted sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <p className="font-semibold text-ink">Explore</p>
            <Link href="/listings">Latest Listings</Link>
            <Link href="/categories">Categories</Link>
            <Link href="/in/delhi/astrologer">Astrologers in Delhi</Link>
          </div>
          <div className="grid gap-2">
            <p className="font-semibold text-ink">Account</p>
            <Link href="/signup">Create Account</Link>
            <Link href="/login">Login</Link>
          </div>
          <div className="grid gap-2">
            <p className="font-semibold text-ink">Resources</p>
            <Link href="/blog">Blog</Link>
            <Link href="/blog/how-to-choose-premium-service-provider">How to Choose Providers</Link>
          </div>
          <div className="grid gap-2">
            <p className="font-semibold text-ink">Search Access</p>
            <Link href="/sitemap.xml">Sitemap</Link>
            <Link href="/robots.txt">Robots</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
