import { Select } from '@mantine/core'
import { IconCoin } from '@tabler/icons-react'
import { useDisplayCurrency } from './useDisplayCurrency'

export function DisplayCurrencyPicker() {
  const { currency, setCurrency, options } = useDisplayCurrency()
  return (
    <Select
      label="Display currency"
      description="Converts figures for viewing only"
      data={options}
      value={currency}
      onChange={(value) => value && setCurrency(value)}
      allowDeselect={false}
      leftSection={<IconCoin size={16} aria-hidden />}
      w={200}
      comboboxProps={{ shadow: 'md' }}
    />
  )
}
