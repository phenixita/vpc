import type { CurveConfig, PriceTier } from '../pricing'

type PriceResultsProps = {
  curve: CurveConfig | null
  title: string
  tiers: PriceTier[]
  emptyMessage: string
}

export function PriceResults({ curve, title, tiers, emptyMessage }: PriceResultsProps) {
  return (
    <section className="results" aria-live="polite">
      <div className="results-header">
        <h3>{title}</h3>
        {curve ? <span className="curve-pill">{curve.name}</span> : null}
      </div>

      {tiers.length > 0 ? (
        <div className="tier-grid">
          {tiers.map((tier) => (
            <article className="tier-card" key={tier.label}>
              <span className="tier-label">{tier.label}</span>
              <strong className="tier-amount">{tier.amount}</strong>
              <span className="tier-multiplier">{tier.multiplierLabel}</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-message">{emptyMessage}</p>
      )}
    </section>
  )
}
