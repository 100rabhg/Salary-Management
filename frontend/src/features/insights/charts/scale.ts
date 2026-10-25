// Round axis ticks from 0 up to just past maxValue, about `target` steps,
// with steps of 1, 2, 2.5 or 5 times a power of ten.
export function niceTicks(maxValue: number, target = 4): number[] {
  if (!(maxValue > 0)) return [0]
  const rough = maxValue / target
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((multiple) => multiple * magnitude).find((candidate) => candidate >= rough)!
  const count = Math.ceil(maxValue / step - 1e-9)
  return Array.from({ length: count + 1 }, (_, index) => index * step)
}

export function percentOf(value: number, max: number) {
  return max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
}
