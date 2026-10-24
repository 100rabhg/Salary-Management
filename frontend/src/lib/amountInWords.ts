const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

const CURRENCY_WORDS: Record<string, { one: string; many: string; minor?: { one: string; many: string } }> = {
  INR: { one: 'rupee', many: 'rupees', minor: { one: 'paisa', many: 'paise' } },
  USD: { one: 'dollar', many: 'dollars', minor: { one: 'cent', many: 'cents' } },
  GBP: { one: 'pound', many: 'pounds', minor: { one: 'penny', many: 'pence' } },
  EUR: { one: 'euro', many: 'euros', minor: { one: 'cent', many: 'cents' } },
  SGD: { one: 'Singapore dollar', many: 'Singapore dollars', minor: { one: 'cent', many: 'cents' } },
  JPY: { one: 'yen', many: 'yen' },
}

const INTERNATIONAL_SCALES = ['', 'thousand', 'million', 'billion', 'trillion']
const INDIAN_SCALES = ['', 'thousand', 'lakh', 'crore', 'arab', 'kharab']

function underThousand(value: number): string {
  if (value < 20) return ONES[value]!
  if (value < 100) return `${TENS[Math.floor(value / 10)]}${value % 10 ? `-${ONES[value % 10]}` : ''}`
  return `${ONES[Math.floor(value / 100)]} hundred${value % 100 ? ` ${underThousand(value % 100)}` : ''}`
}

function groupedWords(value: bigint, indian: boolean): string {
  if (value === 0n) return 'zero'

  const groups: number[] = []
  let remaining = value
  groups.push(Number(remaining % 1000n))
  remaining /= 1000n

  while (remaining > 0n) {
    groups.push(Number(remaining % (indian ? 100n : 1000n)))
    remaining /= indian ? 100n : 1000n
  }

  const scales = indian ? INDIAN_SCALES : INTERNATIONAL_SCALES
  return groups
    .map((group, index) => ({ group, index }))
    .filter(({ group }) => group > 0)
    .reverse()
    .map(({ group, index }) => `${underThousand(group)}${scales[index] ? ` ${scales[index]}` : ''}`)
    .join(' ')
}

/** Human-readable amount helper for the salary forms; returns null while empty or invalid. */
export function amountInWords(value: string | number, currency: string | null): string | null {
  const units = CURRENCY_WORDS[currency ?? '']
  if (!units) return null

  const match = String(value).trim().replaceAll(',', '').match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!match) return null

  const major = BigInt(match[1]!)
  const minor = units.minor ? Number((match[2] ?? '').padEnd(2, '0')) : 0
  if (!units.minor && match[2] && Number(match[2]) > 0) return null
  if (major === 0n && minor === 0) return null

  const majorWords = groupedWords(major, currency === 'INR')
  const majorUnit = major === 1n ? units.one : units.many
  const minorWords = units.minor && minor > 0
    ? ` and ${underThousand(minor)} ${minor === 1 ? units.minor.one : units.minor.many}`
    : ''

  return `${majorWords} ${majorUnit}${minorWords}`.replace(/^./, (first) => first.toUpperCase())
}
