"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudDownload, LoaderCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { VideoStatus } from "@/lib/videos";

export function PreparingVideo({ videoId, initialStatus }: { videoId: string; initialStatus: VideoStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState("");
  const requested = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      if (!requested.current && (initialStatus === "available" || initialStatus === "failed")) {
        requested.current = true;
        const response = await fetch(`/api/videos/${videoId}/prepare`, { method: "POST" });
        if (!response.ok) { if (!cancelled) setError("Could not start video preparation."); return; }
        if (!cancelled) setStatus("queued");
      }
      while (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const response = await fetch(`/api/videos/${videoId}/status`, { cache: "no-store" });
        if (!response.ok) continue;
        const result = await response.json();
        if (cancelled) return;
        setStatus(result.status);
        setError(result.error ?? "");
        if (result.status === "ready") { router.refresh(); return; }
        if (result.status === "failed") return;
      }
    }
    void prepare();
    return () => { cancelled = true; };
  }, [initialStatus, router, videoId]);

  return (
    <div className="preparing-player">
      {status === "failed" ? <RotateCcw /> : status === "available" ? <CloudDownload /> : <LoaderCircle className="animate-spin" />}
      <h2>{status === "failed" ? "Preparation paused" : "Preparing your stream"}</h2>
      <p>{error || "Downloading privately from IDrive, then packaging an optimized HLS stream. This first play can take a few minutes."}</p>
      {status === "failed" && <Button onClick={async () => { requested.current = true; setError(""); setStatus("queued"); await fetch(`/api/videos/${videoId}/prepare`, { method: "POST" }); window.location.reload(); }}>Try again</Button>}
    </div>
  );
}
