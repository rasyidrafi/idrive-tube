import * as VolumeSlider from "@/components/limeplay/volume-control"

export function HorizontalVolumeSliderControl() {
  return (
    <VolumeSlider.Root
      className="media-hit-area media-hit-area-volume-horizontal relative z-10 h-1 w-14 cursor-crosshair rounded-md"
      orientation="horizontal"
    >
      <VolumeSlider.Track>
        <VolumeSlider.Progress />
      </VolumeSlider.Track>
      <VolumeSlider.Thumb className="size-2.5" />
    </VolumeSlider.Root>
  )
}
