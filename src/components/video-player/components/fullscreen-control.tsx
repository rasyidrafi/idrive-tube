"use client";

import { ArrowsInIcon, ArrowsOutIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/video-player/components/button";

export function FullscreenControl() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const update = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    const player = event.currentTarget.closest<HTMLElement>("[data-layout-type='root-container']");
    await player?.requestFullscreen?.();
  }

  return (
    <Button
      aria-label={active ? "Exit fullscreen" : "Enter fullscreen"}
      aria-pressed={active}
      className="cursor-pointer"
      onClick={toggle}
      size="icon"
      title={active ? "Exit fullscreen" : "Enter fullscreen"}
      variant="glass"
    >
      {active ? <ArrowsInIcon weight="bold" /> : <ArrowsOutIcon weight="bold" />}
    </Button>
  );
}
