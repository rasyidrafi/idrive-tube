export function maximumKeyframeInterval(output: string, durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return Number.POSITIVE_INFINITY;
  const timestamps = output
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= durationSeconds)
    .sort((left, right) => left - right);
  if (timestamps.length === 0) return Number.POSITIVE_INFINITY;

  let maximum = Math.max(0, timestamps[0]);
  for (let index = 1; index < timestamps.length; index += 1) {
    maximum = Math.max(maximum, timestamps[index] - timestamps[index - 1]);
  }
  return Math.max(maximum, durationSeconds - timestamps[timestamps.length - 1]);
}
