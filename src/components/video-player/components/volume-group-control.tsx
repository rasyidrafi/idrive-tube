import { HorizontalVolumeSliderControl } from "@/components/video-player/components/volume-slider-control"
import { VolumeStateControl } from "@/components/video-player/components/volume-state-control"

export function VolumeGroupControl() {
  return (
    <div className="flex min-w-24 shrink-0 flex-row items-center gap-1.5 pe-2">
      <div className="shrink-0">
        <VolumeStateControl />
      </div>
      <HorizontalVolumeSliderControl />
    </div>
  )
}
