import Link from "next/link";
import { Suspense } from "react";
import { Home, Library } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu, UserMenuSkeleton } from "@/components/user-menu";
import { buttonVariants } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-frame">
      <header className="topbar">
        <Link className="brand" href="/"><BrandMark />IDrive<strong>Tube</strong></Link>
        <nav className="desktop-nav">
          <Link className={buttonVariants({ variant: "ghost" })} href="/"><Home /> Home</Link>
          <Link className={buttonVariants({ variant: "ghost" })} href="/#library"><Library /> Library</Link>
        </nav>
        <div className="user-cluster">
          <Suspense fallback={<UserMenuSkeleton />}><UserMenu /></Suspense>
          <ThemeToggle />
        </div>
      </header>
      <main className="content-shell">{children}</main>
      <nav className="mobile-nav">
        <Link href="/"><Home /><span>Home</span></Link>
        <Link href="/#library"><Library /><span>Library</span></Link>
      </nav>
    </div>
  );
}
