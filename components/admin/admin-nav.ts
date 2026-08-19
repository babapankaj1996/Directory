import {
  BarChart3,
  FileText,
  Globe2,
  LayoutDashboard,
  MapPin,
  FileDiff,
  Megaphone,
  MessageSquareText,
  Send,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  Wallet
} from "lucide-react";

export const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/listings", label: "Listings", icon: Users },
  { href: "/admin/changes", label: "Changes", icon: FileDiff },
  { href: "/admin/featured-requests", label: "Featured", icon: Megaphone },
  { href: "/admin/wallet", label: "Wallet", icon: Wallet },
  { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { href: "/admin/quotes", label: "Quotes", icon: Send },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/countries", label: "Countries", icon: Globe2 },
  { href: "/admin/cities", label: "Cities", icon: MapPin },
  { href: "/admin/blog", label: "Blog", icon: FileText },
  { href: "/admin/seo", label: "SEO", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];
