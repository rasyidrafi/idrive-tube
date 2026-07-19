// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ seek: vi.fn() }));

vi.mock("@/hooks/limeplay/use-playback", () => ({
  MediaReadyState: { HAVE_METADATA: 1 },
  usePlaybackStore: (selector: (state: { readyState: number }) => unknown) => selector({ readyState: 1 }),
}));
vi.mock("@/hooks/limeplay/use-player", () => ({
  usePlayerStore: (selector: (state: { instance: { seekRange: () => { start: number; end: number } } }) => unknown) =>
    selector({ instance: { seekRange: () => ({ start: 0, end: 120 }) } }),
}));
vi.mock("@/hooks/limeplay/use-timeline", () => ({
  useTimelineStore: (selector: (state: Record<string, unknown>) => unknown) => selector({
    currentTime: 30,
    duration: 120,
    hoveringTime: 30,
    isLive: false,
    seek: mocks.seek,
    setHoveringTime: vi.fn(),
    setIsHovering: vi.fn(),
  }),
}));
vi.mock("@/hooks/limeplay/use-track-events", () => ({ useTrackEvents: () => ({}) }));

import * as Timeline from "@/components/limeplay/timeline-control";

describe("timeline keyboard accessibility", () => {
  beforeEach(() => mocks.seek.mockClear());

  it("renders one named range control and seeks with ArrowRight", () => {
    render(<Timeline.Root><Timeline.Track /><Timeline.Thumb aria-label="Seek" /></Timeline.Root>);
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(1);
    expect(sliders[0].getAttribute("aria-label")).toBe("Seek");
    fireEvent.keyDown(sliders[0], { key: "ArrowRight" });
    expect(mocks.seek).toHaveBeenCalled();
  });
});
