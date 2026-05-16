export interface BalloonColor {
  bg: string
  border: string
}

export const BALLOON_COLORS: BalloonColor[] = [
  { bg: '#fde68a', border: '#f59e0b' },  // amber
  { bg: '#bfdbfe', border: '#3b82f6' },  // blue
  { bg: '#bbf7d0', border: '#22c55e' },  // green
  { bg: '#e9d5ff', border: '#a855f7' },  // purple
  { bg: '#fed7aa', border: '#f97316' },  // orange
  { bg: '#fecdd3', border: '#f43f5e' },  // rose
]

export function getBalloonColor(index: number): BalloonColor {
  return BALLOON_COLORS[index % BALLOON_COLORS.length]
}
