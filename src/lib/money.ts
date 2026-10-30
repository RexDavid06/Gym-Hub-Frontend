const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const DECIMAL = /^(-?)(\d+)(?:\.(\d{1,2}))?$/

/**
 * Format an API decimal string as Nigerian naira.
 *
 * The API always sends money as a decimal string, so the major part is parsed
 * as an integer (exact) and the minor part is carried through as text. No
 * floating-point arithmetic happens anywhere in this module, which means a
 * price of 15000.00 never drifts through rounding.
 */
export function formatNaira(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const raw = typeof amount === 'number' ? amount.toFixed(2) : String(amount).trim()
  const match = DECIMAL.exec(raw)
  if (!match) return raw

  const [, sign, major, minor] = match
  const kobo = (minor ?? '').padEnd(2, '0')
  return `${sign}${nairaFormatter.format(Number(major))}.${kobo}`
}

/**
 * Normalise user input into the decimal string the API expects, again without
 * doing any arithmetic on the money itself.
 */
export function toDecimalString(input: string): string {
  const cleaned = input.replace(/[^\d.]/g, '')
  const [whole = '', fraction = ''] = cleaned.split('.')
  const major = whole === '' ? '0' : whole.replace(/^0+(?=\d)/, '')
  const kobo = (fraction + '00').slice(0, 2)
  return `${major}.${kobo}`
}

/** True when the input can be sent to the API as a positive money amount. */
export function isPositiveAmount(input: string): boolean {
  const raw = input.replace(/[^\d.]/g, '')
  if (raw === '' || raw === '.') return false
  const [whole = '', fraction = ''] = raw.split('.')
  if (Number(whole) === 0) {
    return Number(`0.${fraction}`) > 0
  }
  return true
}
