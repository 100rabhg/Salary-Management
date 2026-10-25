import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { useMeta } from '../../api/queries'

const STORAGE_KEY = 'acme-salary.display-currency'

function readStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(currency: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, currency)
  } catch {
    // Storage can be unavailable (private mode); the URL still carries it.
  }
}

// The currency figures are shown in. It only changes how reports display
// salaries, never the stored records. Order of preference: the URL
// (?currency=USD), this browser's last choice, then the app default (INR).
export function useDisplayCurrency() {
  const [searchParams, setSearchParams] = useSearchParams()
  const meta = useMeta()
  const supported = meta.data?.currencies.map((currency) => currency.code)
  const fallback = meta.data?.default_currency ?? 'INR'
  const candidate = searchParams.get('currency') ?? readStored() ?? fallback
  const currency = !supported || supported.includes(candidate) ? candidate : fallback

  const setCurrency = useCallback(
    (next: string) => {
      writeStored(next)
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          params.set('currency', next)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { currency, setCurrency, options: supported ?? [currency], ready: meta.isSuccess }
}
