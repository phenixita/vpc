import type { CurveAnalysisResult } from '../openrouter'
import type { CurrencyCode, CurveConfig, PriceTier } from '../pricing'
import { PriceResults } from './PriceResults'
import { ValueFields } from './ValueFields'

type AiScenarioProps = {
  projectBrief: string
  maxProjectBriefLength: number
  onProjectBriefChange: (value: string) => void
  canAnalyze: boolean
  isAnalyzing: boolean
  onAnalyze: () => void
  hasConfiguredOpenRouterKey: boolean
  analysisError: string
  aiWarningItems: string[]
  hasSanitizedBrief: boolean
  onSanitizedBriefChange: (checked: boolean) => void
  aiProjectValue: string
  onAiProjectValueChange: (value: string) => void
  aiCurrency: CurrencyCode
  onAiCurrencyChange: (currency: CurrencyCode) => void
  showAiValueError: boolean
  aiAnalysis: CurveAnalysisResult | null
  aiCurve: CurveConfig | null
  aiSuggestedPerceivedValue: string
  aiTiers: PriceTier[]
  aiEmptyMessage: string
}

export function AiScenario({
  projectBrief,
  maxProjectBriefLength,
  onProjectBriefChange,
  canAnalyze,
  isAnalyzing,
  onAnalyze,
  hasConfiguredOpenRouterKey,
  analysisError,
  aiWarningItems,
  hasSanitizedBrief,
  onSanitizedBriefChange,
  aiProjectValue,
  onAiProjectValueChange,
  aiCurrency,
  onAiCurrencyChange,
  showAiValueError,
  aiAnalysis,
  aiCurve,
  aiSuggestedPerceivedValue,
  aiTiers,
  aiEmptyMessage,
}: AiScenarioProps) {
  return (
    <section className="scenario" id="ai-panel" role="tabpanel" aria-labelledby="ai-tab">
      <div className="field">
        <div className="field-header">
          <label htmlFor="projectBrief">Prompt</label>
          <span className="character-count">
            {projectBrief.length} / {maxProjectBriefLength}
          </span>
        </div>
        <textarea
          id="projectBrief"
          name="projectBrief"
          maxLength={maxProjectBriefLength}
          placeholder="Describe the project and add context such as region, client revenue, typical buyer mindset, urgency, risk, and upside."
          value={projectBrief}
          onChange={(event) => onProjectBriefChange(event.target.value)}
        />
      </div>

      <div className="actions">
        <button type="button" className="primary-button" onClick={onAnalyze} disabled={!canAnalyze}>
          {isAnalyzing ? 'Asking AI...' : 'Ask AI to choose the curve'}
        </button>

        {!hasConfiguredOpenRouterKey ? (
          <p className="status-message">AI is unavailable until VITE_OPENROUTER_API_KEY is configured.</p>
        ) : null}

        {analysisError ? (
          <p className="field-error" role="alert">
            {analysisError}
          </p>
        ) : null}
      </div>

      <div className="warning-box">
        <h3>Warning</h3>
        <ul>
          {aiWarningItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <label className="checkbox-row" htmlFor="sanitizedBrief">
          <input
            id="sanitizedBrief"
            name="sanitizedBrief"
            type="checkbox"
            checked={hasSanitizedBrief}
            onChange={(event) => onSanitizedBriefChange(event.target.checked)}
          />
          <span>I confirmed the prompt is sanitized.</span>
        </label>
      </div>

      <div className="field-grid field-grid--two">
        <ValueFields
          idPrefix="ai"
          projectValue={aiProjectValue}
          onProjectValueChange={onAiProjectValueChange}
          currency={aiCurrency}
          onCurrencyChange={onAiCurrencyChange}
          showValueError={showAiValueError}
        />
      </div>

      {aiAnalysis && aiCurve ? (
        <section className="ai-explanation" aria-live="polite">
          <div className="results-header">
            <h3>AI recommendation</h3>
            <span className="curve-pill">{aiCurve.name}</span>
          </div>

          <p className="ai-summary">{aiAnalysis.summary}</p>
          <p className="status-message">Suggested perceived value: {aiSuggestedPerceivedValue}</p>

          <div className="ai-reasoning">
            <h4>Reasoning</h4>
            <ul>
              {aiAnalysis.reasoning.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <PriceResults curve={aiCurve} title="3 price tiers" tiers={aiTiers} emptyMessage={aiEmptyMessage} />
    </section>
  )
}
