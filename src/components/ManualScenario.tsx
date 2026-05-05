import type { CurveId } from '../openrouter'
import type { CurrencyCode, CurveConfig, PriceTier } from '../pricing'
import { PriceResults } from './PriceResults'
import { ValueFields } from './ValueFields'

type ManualScenarioProps = {
  manualProjectValue: string
  onManualProjectValueChange: (value: string) => void
  manualCurrency: CurrencyCode
  onManualCurrencyChange: (currency: CurrencyCode) => void
  showManualValueError: boolean
  manualCurveId: CurveId | ''
  onManualCurveChange: (curveId: CurveId | '') => void
  manualCurve: CurveConfig | null
  manualTiers: PriceTier[]
  curves: CurveConfig[]
}

export function ManualScenario({
  manualProjectValue,
  onManualProjectValueChange,
  manualCurrency,
  onManualCurrencyChange,
  showManualValueError,
  manualCurveId,
  onManualCurveChange,
  manualCurve,
  manualTiers,
  curves,
}: ManualScenarioProps) {
  return (
    <section className="scenario" id="manual-panel" role="tabpanel" aria-labelledby="manual-tab">
      <div className="field-grid">
        <ValueFields
          idPrefix="manual"
          projectValue={manualProjectValue}
          onProjectValueChange={onManualProjectValueChange}
          currency={manualCurrency}
          onCurrencyChange={onManualCurrencyChange}
          showValueError={showManualValueError}
        />

        <div className="field field--curve">
          <label htmlFor="manual-curve">How bad do you want to land this project?</label>
          <select
            id="manual-curve"
            name="manual-curve"
            value={manualCurveId}
            onChange={(event) => onManualCurveChange(event.target.value as CurveId | '')}
          >
            <option value="">Choose...</option>
            {curves.map((curve) => (
              <option key={curve.id} value={curve.id}>
                {curve.name}
              </option>
            ))}
          </select>
          <div className="field-hint">
            <p>This setting affects the pricing curve of your options.{' '}
              <a href="https://jonathanstark.com/pricing-curves" target="_blank" rel="noopener noreferrer">
                Get the formulas behind these pricing curves »
              </a>
            </p>
          </div>
        </div>
      </div>

      <PriceResults
        curve={manualCurve}
        title="3 price tiers"
        tiers={manualTiers}
        emptyMessage="Enter the perceived value and choose a curve."
      />
    </section>
  )
}
