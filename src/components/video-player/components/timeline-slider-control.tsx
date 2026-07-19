"use client"

import { useState, type CSSProperties } from "react"

import { Button } from "@/components/video-player/components/button"
import { usePlayerStore } from "@/hooks/limeplay/use-player"
import { useTimelineStore } from "@/hooks/limeplay/use-timeline"
import * as TimelineSlider from "@/components/limeplay/timeline-control"
import {
  Duration,
  Elapsed,
  HoverTime,
  LiveLatency,
  Remaining,
} from "@/components/limeplay/timeline-labels"

const LIVE_DELAY_VISIBLE_SEC = 3

export function TimelineSliderControl() {
  const [showRemaining, setShowRemaining] = useState(false)
  const liveLatency = useTimelineStore((state) => state.liveLatency)
  const isLive = useTimelineStore((state) => state.isLive)
  const currentTime = useTimelineStore((state) => state.currentTime)
  const duration = useTimelineStore((state) => state.duration)
  const player = usePlayerStore((state) => state.instance)
  const hasLiveLatency = liveLatency != null
  const showGoToLive = hasLiveLatency && liveLatency >= LIVE_DELAY_VISIBLE_SEC
  const showLiveBadge = hasLiveLatency && liveLatency < LIVE_DELAY_VISIBLE_SEC

  return (
    <div
      className="
        me-auto flex grow items-center gap-1.5 select-none
        @3xl/root:gap-3
      "
    >
      {!isLive && <Elapsed className="px-2 text-xs font-medium" />}
      <div className="group/timeline relative w-full grow">
        <TimelineSlider.Root
          className={`
            group media-hit-area media-hit-area-timeline h-1 cursor-crosshair rounded-full transition-[height] duration-150 ease-in-out
            active:data-[orientation=horizontal]:h-(--lp-timeline-track-height-active)
          `}
        >
          <TimelineSlider.Track className="overflow-hidden rounded-full">
            <TimelineSlider.Progress className="rounded-s-full" />
            <TimelineSlider.Buffered variant="combined" />
          </TimelineSlider.Track>
          <TimelineSlider.Thumb
            className={`
              absolute size-3 rounded-full bg-primary opacity-0 transition-opacity duration-300
              group-hover/timeline:opacity-100 has-[input:focus-visible]:opacity-100
            `}
            aria-label="Seek"
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          />
          <TimelineHoverPreview duration={duration} isLive={isLive} />
        </TimelineSlider.Root>
      </div>
      {!isLive && (
        <button
          aria-label={
            showRemaining ? "Show total duration" : "Show remaining time"
          }
          aria-pressed={showRemaining}
          className="
            inline-flex h-7 w-[6ch] cursor-pointer items-center justify-center rounded-sm
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/50 focus-visible:outline-solid
          "
          onClick={() => {
            setShowRemaining(!showRemaining)
          }}
          tabIndex={0}
          type="button"
        >
          {showRemaining ? (
            <Remaining className="text-xs font-medium" />
          ) : (
            <Duration className="text-xs font-medium" />
          )}
        </button>
      )}
      {isLive && (
        <>
          {showGoToLive && player && (
            <>
              <LiveLatency className="text-xs font-medium" />
              <Button
                aria-label="Go to live"
                className="
                  cursor-pointer px-2
                  @md/root:px-2.5
                  @3xl/root:px-3
                "
                onClick={() => void player.goToLive()}
                size="sm"
                variant="glass"
              >
                <span className="text-xs font-medium text-primary">
                  Go to live
                </span>
              </Button>
            </>
          )}
          {showLiveBadge && (
            <div className="flex items-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold tracking-wide">
              <span className="tracking-widest">LIVE</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TimelineHoverPreview({ duration, isLive }: { duration: number; isLive: boolean }) {
  const hoveringTime = useTimelineStore((state) => state.hoveringTime)
  const position = duration > 0 ? Math.max(0, Math.min(100, (hoveringTime / duration) * 100)) : 0
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ "--hover-position": `${position}%` } as CSSProperties}>
      <span className="absolute left-(--hover-position) top-1/2 h-8 w-px -translate-y-1/2 bg-primary/60 opacity-0 transition-opacity group-hover/timeline:opacity-100" />
      <span className="absolute bottom-[calc(100%+16px)] left-(--hover-position) -translate-x-1/2 whitespace-nowrap text-xs font-medium opacity-0 transition-opacity group-hover/timeline:opacity-100">
        {isLive && <>&minus;</>}<HoverTime />
        {!isLive && <>&nbsp;/&nbsp;<Duration className="text-primary/60" /></>}
      </span>
    </div>
  )
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = Math.floor(seconds % 60)
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`
    : `${minutes}:${remainder.toString().padStart(2, "0")}`
}
