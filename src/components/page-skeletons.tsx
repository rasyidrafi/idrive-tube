import { Cloud } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export function LibrarySkeleton() {
  return (
    <section id="library" aria-busy="true" aria-label="Loading video library">
      <div className="section-title"><Cloud /> IDrive library <Skeleton className="h-5 w-8 rounded-full" /></div>
      <div className="video-grid">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="video-card" key={index}>
            <Skeleton className="thumbnail-frame block" />
            <div className="video-card-copy space-y-2"><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-2/5" /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function WatchSkeleton() {
  return (
    <div className="watch-layout" aria-busy="true" aria-label="Loading video">
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <div className="watch-copy space-y-4">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-14 w-3/4" />
        <Skeleton className="h-5 w-full max-w-2xl" />
        <Skeleton className="h-5 w-2/3 max-w-xl" />
      </div>
    </div>
  );
}

export function LoginPanelSkeleton() {
  return (
    <div className="login-panel"><div className="login-form-wrap space-y-5">
      <Skeleton className="h-4 w-44" /><Skeleton className="h-28 w-full" /><Skeleton className="h-5 w-3/4" />
      <Skeleton className="mt-8 h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
    </div></div>
  );
}

export function HomeLoading() {
  return <AppShell><HeroSkeleton /><LibrarySkeleton /></AppShell>;
}

export function WatchLoading() {
  return <AppShell><WatchSkeleton /></AppShell>;
}

function HeroSkeleton() {
  return <section className="hero-panel"><div className="w-full space-y-5"><Skeleton className="h-4 w-52 bg-white/15" /><Skeleton className="h-28 w-3/4 bg-white/15" /><Skeleton className="h-5 w-1/2 bg-white/15" /></div></section>;
}
