import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <Header />
      <div id="main-content" className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}
