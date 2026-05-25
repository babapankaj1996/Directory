import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { blogPosts } from "@/lib/data";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "Service Provider Guides",
  description: "Practical guides for comparing local professionals, checking reviews, understanding pricing, booking consultations and choosing trusted service providers."
};

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <PageHeading
        eyebrow="Service guides"
        title="Helpful guides for choosing service providers"
        description="Read practical advice on comparing professionals, checking verification badges, reviewing prices, understanding availability and contacting providers with confidence."
      />
      <section className="mt-12 grid gap-6 md:grid-cols-2">
        {blogPosts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="glass group overflow-hidden rounded-[2rem] transition hover:-translate-y-1 hover:shadow-glow">
            <div className="relative h-64">
              <Image src={post.image} alt={post.title} fill className="object-cover transition duration-500 group-hover:scale-105" />
            </div>
            <div className="p-6">
              <p className="flex items-center gap-2 text-sm text-champagne"><CalendarDays className="h-4 w-4" /> {post.date}</p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">{post.title}</h2>
              <p className="mt-3 leading-7 text-muted">{post.excerpt}</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
