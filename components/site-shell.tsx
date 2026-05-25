import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FloatingOrbs } from "@/components/floating-orbs";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <FloatingOrbs />
      <Header />
      {children}
      <Footer />
    </div>
  );
}
