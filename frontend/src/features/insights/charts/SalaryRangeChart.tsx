import { Text, Tooltip } from '@mantine/core'
import type { SalaryRange } from '../../../api/types'
import { formatMoney } from '../../../lib/format'
import { ChartAxis, Gridlines } from './ChartAxis'
import classes from './charts.module.css'
import { niceTicks, percentOf } from './scale'

export interface RangeRow extends SalaryRange {
  label: string
}

// One row per group: a min-max whisker, a box for the middle half
// (25th-75th percentile) and a tick at the median. All annual salaries.
export function SalaryRangeChart({ rows, currency, title }: { rows: RangeRow[]; currency: string; title: string }) {
  const ticks = niceTicks(Math.max(0, ...rows.map((row) => Number(row.max ?? 0))))
  const max = ticks.at(-1) ?? 0
  const at = (value: string | null) => `${percentOf(Number(value), max)}%`

  return (
    <div className={classes.chart}>
      <RangeKey />
      <div role="list" aria-label={title}>
        {rows.map((row) => {
          if (row.headcount === 0 || row.median === null) {
            return (
              <div key={row.label} className={classes.row} role="listitem" aria-label={`${row.label}: no employees`}>
                <span className={classes.label}>{row.label}</span>
                <div className={classes.plot}>
                  <Gridlines ticks={ticks} />
                  <span className={classes.empty}>No employees</span>
                </div>
              </div>
            )
          }
          const details = [
            `Median ${formatMoney(row.median, currency)}`,
            `Middle half ${formatMoney(row.p25!, currency)} – ${formatMoney(row.p75!, currency)}`,
            `Range ${formatMoney(row.min!, currency)} – ${formatMoney(row.max!, currency)}`,
            `Average ${formatMoney(row.mean!, currency)}`,
            `${row.headcount} ${row.headcount === 1 ? 'employee' : 'employees'}`,
          ]
          return (
            <div key={row.label} className={classes.row} role="listitem">
              <span className={classes.label} title={row.label}>
                {row.label}
              </span>
              <Tooltip
                label={
                  <>
                    <Text size="sm" fw={600}>
                      {row.label}
                    </Text>
                    {details.map((line) => (
                      <Text key={line} size="xs">
                        {line}
                      </Text>
                    ))}
                  </>
                }
                withArrow
                position="top"
              >
                <div className={classes.plot} tabIndex={0} data-interactive aria-label={`${row.label}: ${details.join(', ')}`}>
                  <Gridlines ticks={ticks} />
                  <span
                    className={classes.whisker}
                    style={{ left: at(row.min), width: `calc(${at(row.max)} - ${at(row.min)})` }}
                  />
                  <span className={classes.whiskerEnd} style={{ left: at(row.min) }} />
                  <span className={classes.whiskerEnd} style={{ left: at(row.max) }} />
                  <span className={classes.box} style={{ left: at(row.p25), width: `calc(${at(row.p75)} - ${at(row.p25)})` }} />
                  <span className={classes.median} style={{ left: at(row.median) }} />
                </div>
              </Tooltip>
            </div>
          )
        })}
      </div>
      <ChartAxis ticks={ticks} currency={currency} />
    </div>
  )
}

function RangeKey() {
  return (
    <div className={classes.key} aria-hidden>
      <span className={classes.keyItem}>
        <span className={classes.keyBox} /> Middle half (25th–75th percentile)
      </span>
      <span className={classes.keyItem}>
        <span className={classes.keyMedian} /> Median
      </span>
      <span className={classes.keyItem}>
        <span className={classes.keyWhisker} /> Lowest to highest
      </span>
    </div>
  )
}
