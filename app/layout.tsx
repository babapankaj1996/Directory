import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: {
    default: "Luxury Directory | Verified Service Providers Worldwide",
    template: "%s | Luxury Directory"
  },
  description: "Discover verified service providers worldwide. Compare professionals by location, category, reviews, pricing, availability and profile details before you contact or book.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  icons: {
    icon: "/favicon.svg"
  },
  openGraph: {
    title: "Luxury Directory",
    description: "Find trusted professionals, compare service profiles, read reviews and contact or book providers worldwide.",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
