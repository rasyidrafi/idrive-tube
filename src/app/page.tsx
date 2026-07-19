import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Cloud, Film, LockKeyhole } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { LibrarySkeleton } from "@/components/page-skeletons";
import { VideoCard } from "@/components/video-card";
import { RefreshCatalog } from "@/components/refresh-catalog";
import { currentUser } from "@/lib/session";
import { listVideosForUser } from "@/lib/videos";

// Next's instant validator requires concrete session-cookie samples. Keep the authenticated
// entry exempt while Cache Components still prerenders and streams the local Suspense shell.
export const unstable_instant = false;

export default function HomePage() {
  return (
    <AppShell>
      <section className="hero-panel">
        <div>
          <div className="eyebrow"><LockKeyhole className="size-3.5" /> Read-only private streaming</div>
          <h1>Your IDrive,<br /><span>now a cinema.</span></h1>
          <p>Videos are discovered from your private IDrive folder and prepared for streaming only when you watch them.</p>
        </div>
        <RefreshCatalog />
      </section>
      <Suspense fallback={<LibrarySkeleton />}><VideoLibrary /></Suspense>
    </AppShell>
  );
}

async function VideoLibrary() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const videos = await listVideosForUser(user.userId, user.role === "admin");

  return (
      <section id="library">
        <div className="section-title"><Cloud /> IDrive library <span>{videos.length}</span></div>
        {videos.length > 0 ? (
          <div className="video-grid">
            {videos.map((video) => <VideoCard key={video.id} video={video} />)}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-orbit"><Film /></div>
            <h2>No videos discovered</h2>
            <p>Place supported video files in the configured IDrive folder, then refresh the catalog.</p>
            <RefreshCatalog variant="outline" />
          </div>
        )}
      </section>
  );
}
