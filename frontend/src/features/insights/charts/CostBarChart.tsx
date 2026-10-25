import { Text, Tooltip } from '@mantine/core'
import { formatMoney } from '../../../lib/format'
import { ChartAxis, Gridlines } from './ChartAxis'
import classes from './charts.module.css'
import { niceTicks, percentOf } from './scale'

export interface CostBar {
  label: string
  value: number
  details: string[]
}

// Horizontal bars from a zero baseline, one hue. Exact values are in the
// tooltip (hover or keyboard focus) and in the report's table view.
export function CostBarChart({ bars, currency, title }: { bars: CostBar[]; currency: string; title: string }) {
  const ticks = niceTicks(Math.max(0, ...bars.map((bar) => bar.value)))
  const max = ticks.at(-1) ?? 0
  return (
    <div className={classes.chart} role="list" aria-label={title}>
      {bars.map((bar) => {
        const summary = `${bar.label}: ${formatMoney(bar.value, currency)}`
        return (
          <div key={bar.label} className={classes.row} role="listitem">
            <span className={classes.label} title={bar.label}>
              {bar.label}
            </span>
            <Tooltip
              label={
                <>
                  <Text size="sm" fw={600}>
                    {summary}
                  </Text>
                  {bar.details.map((line) => (
                    <Text key={line} size="xs">
                      {line}
                    </Text>
                  ))}
                </>
              }
              withArrow
              position="top"
            >
              <div
                className={classes.plot}
                tabIndex={0}
                data-interactive
                aria-label={[summary, ...bar.details].join(', ')}
              >
                <Gridlines ticks={ticks} />
                <span className={classes.bar} style={{ width: `${percentOf(bar.value, max)}%` }} />
              </div>
            </Tooltip>
          </div>
        )
      })}
      <ChartAxis ticks={ticks} currency={currency} />
    </div>
  )
}
