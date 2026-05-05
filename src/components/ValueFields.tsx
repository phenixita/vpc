import { currencies, type CurrencyCode } from '../pricing'

type ValueFieldsProps = {
  idPrefix: string
  projectValue: string
  onProjectValueChange: (value: string) => void
  currency: CurrencyCode
  onCurrencyChange: (currency: CurrencyCode) => void
  showValueError: boolean
}

export function ValueFields({
  idPrefix,
  projectValue,
  onProjectValueChange,
  currency,
  onCurrencyChange,
  showValueError,
}: ValueFieldsProps) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-projectValue`}>Perceived value</label>
        <input
          id={`${idPrefix}-projectValue`}
          name={`${idPrefix}-projectValue`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="100,000"
          value={projectValue}
          onChange={(event) => onProjectValueChange(event.target.value)}
        />
        {showValueError ? <p className="field-error">Enter a valid amount.</p> : null}
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-currency`}>Currency</label>
        <select
          id={`${idPrefix}-currency`}
          name={`${idPrefix}-currency`}
          value={currency}
          onChange={(event) => onCurrencyChange(event.target.value as CurrencyCode)}
        >
          {Object.entries(currencies).map(([code, details]) => (
            <option key={code} value={code}>
              {code} · {details.label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
