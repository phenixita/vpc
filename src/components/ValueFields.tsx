type ValueFieldsProps = {
  idPrefix: string
  projectValue: string
  onProjectValueChange: (value: string) => void
  showValueError: boolean
}

export function ValueFields({
  idPrefix,
  projectValue,
  onProjectValueChange,
  showValueError,
}: ValueFieldsProps) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-projectValue`}>Perceived value (e.g. EUR, USD, GBP)</label>
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
    </>
  )
}
