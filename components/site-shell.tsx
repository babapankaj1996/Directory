import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
