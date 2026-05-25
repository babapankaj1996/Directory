import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { blogPosts } from "@/lib/data";
import { GlassCard } from "@/components/ui/glass-card";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) return { title: "Blog" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, images: [post.image] }
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <article>
        <div className="relative mb-8 h-80 overflow-hidden rounded-[2rem] shadow-glass">
          <Image src={post.image} alt={post.title} fill priority className="object-cover" />
        </div>
        <GlassCard>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-champagne">{post.date}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink md:text-5xl">{post.title}</h1>
          <p className="mt-5 text-lg leading-8 text-muted">{post.excerpt}</p>
          <div className="prose prose-slate mt-8 max-w-none">
            <p>
              A good provider shortlist starts with clear requirements: location, service category, budget, availability, preferred contact method and proof of past work. Use profile pages to compare service descriptions, reviews, gallery media, pricing notes and verification signals before you contact anyone.
            </p>
            <h2>How to compare professionals before booking</h2>
            <p>
              Check whether the provider serves your city, offers the exact service you need, shows recent reviews, provides transparent rates or consultation notes, and supports the contact method you prefer. If a provider supports booking requests, chat, calls or video consultations, share enough detail so they can respond with accurate availability.
            </p>
          </div>
        </GlassCard>
      </article>
    </main>
  );
}
