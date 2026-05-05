import type { CurveId } from './openrouter'

export type CurrencyCode = 'EUR' | 'USD' | 'GBP'

export type CurveConfig = {
  id: CurveId
  name: string
  multipliers: [number, number, number]
}

export type PriceTier = {
  label: string
  amount: string
  multiplierLabel: string
}

export const curves: CurveConfig[] = [
  {
    id: 'might-as-well',
    name: "Meh, I don't really care",
    multipliers: [0.1, 0.15, 0.175],
  },
  {
    id: 'goldilocks',
    name: 'I want to land it really bad!',
    multipliers: [0.1, 0.22, 0.5],
  },
]

export const curveMap = Object.fromEntries(curves.map((curve) => [curve.id, curve])) as Record<
  CurveId,
  CurveConfig
>

export const currencies: Record<CurrencyCode, { label: string; locale: string }> = {
  EUR: { label: 'Euro', locale: 'en-IE' },
  USD: { label: 'US Dollar', locale: 'en-US' },
  GBP: { label: 'Pound Sterling', locale: 'en-GB' },
}

export function parseProjectValue(rawValue: string): number | null {
  const sanitized = rawValue.trim().replace(/[^\d.,]/g, '')

  if (!sanitized) {
    return null
  }

  const commaCount = sanitized.split(',').length - 1
  const dotCount = sanitized.split('.').length - 1
  let normalized = sanitized

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = sanitized.lastIndexOf(',')
    const lastDot = sanitized.lastIndexOf('.')
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    const thousandSeparator = decimalSeparator === ',' ? '.' : ','

    normalized = sanitized.split(thousandSeparator).join('').replace(decimalSeparator, '.')
  } else if (commaCount > 0) {
    const digitsAfterComma = sanitized.length - sanitized.lastIndexOf(',') - 1
    normalized =
      commaCount === 1 && digitsAfterComma <= 2
        ? sanitized.replace(',', '.')
        : sanitized.replace(/,/g, '')
  } else if (dotCount > 0) {
    const digitsAfterDot = sanitized.length - sanitized.lastIndexOf('.') - 1
    normalized = dotCount === 1 && digitsAfterDot <= 2 ? sanitized : sanitized.replace(/\./g, '')
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function formatMultiplier(multiplier: number) {
  return `${(multiplier * 100).toLocaleString('en-US', {
    maximumFractionDigits: 1,
  })}%`
}

export function createCurrencyFormatter(currency: CurrencyCode) {
  return new Intl.NumberFormat(currencies[currency].locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })
}

export function formatPerceivedValueForInput(value: number) {
  return Math.round(value).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })
}

export function buildPriceTiers({
  formatter,
  parsedValue,
  selectedCurve,
}: {
  formatter: Intl.NumberFormat
  parsedValue: number | null
  selectedCurve: CurveConfig | null
}): PriceTier[] {
  if (!selectedCurve || !parsedValue) {
    return []
  }

  return selectedCurve.multipliers.map((multiplier, index) => ({
    label: `Tier ${index + 1}`,
    amount: formatter.format(Math.floor(parsedValue * multiplier)),
    multiplierLabel: formatMultiplier(multiplier),
  }))
}
