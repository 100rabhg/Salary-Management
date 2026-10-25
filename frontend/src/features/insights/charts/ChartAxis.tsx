import { formatCompactMoney } from '../../../lib/format'
import classes from './charts.module.css'
import { percentOf } from './scale'

export function Gridlines({ ticks }: { ticks: number[] }) {
  const max = ticks.at(-1) ?? 0
  return (
    <>
      {ticks.map((tick) => (
        <span key={tick} className={classes.gridline} style={{ left: `${percentOf(tick, max)}%` }} aria-hidden />
      ))}
    </>
  )
}

export function ChartAxis({ ticks, currency }: { ticks: number[]; currency: string }) {
  const max = ticks.at(-1) ?? 0
  return (
    <div className={classes.axis} aria-hidden>
      <span />
      <div className={classes.axisPlot}>
        {ticks.map((tick) => (
          <span key={tick} className={classes.tick} style={{ left: `${percentOf(tick, max)}%` }}>
            {formatCompactMoney(tick, currency)}
          </span>
        ))}
      </div>
    </div>
  )
}
