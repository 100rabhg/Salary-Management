import { Stack } from '@mantine/core'
import { pinnedRatesToken, useCurrentRates } from '../../api/insights'
import { DepartmentCostReport } from './DepartmentCostReport'
import { PageHeader } from './PageHeader'
import { RatesNote } from './RatesNote'
import { CountrySalaryDistributionReport, RoleSalaryRangeReport } from './SalaryRangeReport'
import { useDisplayCurrency } from './useDisplayCurrency'

export function InsightsPage() {
  const { currency, ready } = useDisplayCurrency()
  const rates = useCurrentRates()
  // Every report waits for the pinned rate set, so they all convert alike.
  const ratesToken = pinnedRatesToken(rates.data)
  const enabled = ready && !rates.isPending
  const reportProps = { currency, ratesToken, enabled }

  return (
    <Stack gap="lg">
      <PageHeader title="Insights" subtitle="How ACME pays people, from current salaries. Each report has its own filters." />
      <RatesNote rates={rates} currency={currency} />
      <DepartmentCostReport {...reportProps} />
      <RoleSalaryRangeReport {...reportProps} />
      <CountrySalaryDistributionReport {...reportProps} />
    </Stack>
  )
}
