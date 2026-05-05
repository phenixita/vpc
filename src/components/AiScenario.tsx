import type { CurveAnalysisResult } from '../openrouter'
import type { CurveConfig, PriceTier } from '../pricing'
import { PriceResults } from './PriceResults'
import { ValueFields } from './ValueFields'

type AiScenarioProps = {
  projectBrief: string
  maxProjectBriefLength: number
  onProjectBriefChange: (value: string) => void
  systemPrompt: string
  onSystemPromptChange: (value: string) => void
  companyRevenue: string
  onCompanyRevenueChange: (value: string) => void
  influencedPeople: string
  onInfluencedPeopleChange: (value: string) => void
  expectedRevenueIncrease: string
  onExpectedRevenueIncreaseChange: (value: string) => void
  expectedCostReduction: string
  onExpectedCostReductionChange: (value: string) => void
  intangibleBenefits: string[]
  onIntangibleBenefitsChange: (value: string, checked: boolean) => void
  intangibleBenefitsOptions: string[]
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
  systemPrompt,
  onSystemPromptChange,
  companyRevenue,
  onCompanyRevenueChange,
  influencedPeople,
  onInfluencedPeopleChange,
  expectedRevenueIncrease,
  onExpectedRevenueIncreaseChange,
  expectedCostReduction,
  onExpectedCostReductionChange,
  intangibleBenefits,
  onIntangibleBenefitsChange,
  intangibleBenefitsOptions,
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
  showAiValueError,
  aiAnalysis,
  aiCurve,
  aiSuggestedPerceivedValue,
  aiTiers,
  aiEmptyMessage,
}: AiScenarioProps) {
  return (
    <section className="scenario" id="ai-panel" role="tabpanel" aria-labelledby="ai-tab">
      <div className="ai-guide" aria-label="How to use AI pricing">
        <h3>How to use this</h3>
        <ol>
          <li>Write your project prompt in the box below.</li>
          <li>Optionally fill the guided context fields to improve the estimate.</li>
          <li>Press <strong>Ask AI to estimate value and choose the curve</strong>.</li>
        </ol>
        <p>
          After that, the app sets the suggested perceived value and automatically shows the three
          price tiers.
        </p>
      </div>

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

      <div className="field-grid field-grid--two">
        <div className="field">
          <label htmlFor="companyRevenue">Company revenue (optional)</label>
          <input
            id="companyRevenue"
            name="companyRevenue"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Digits only"
            value={companyRevenue}
            onChange={(event) => onCompanyRevenueChange(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="influencedPeople">People impacted (optional)</label>
          <input
            id="influencedPeople"
            name="influencedPeople"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Digits only"
            value={influencedPeople}
            onChange={(event) => onInfluencedPeopleChange(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="expectedRevenueIncrease">Expected revenue increase (optional)</label>
          <input
            id="expectedRevenueIncrease"
            name="expectedRevenueIncrease"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Digits only"
            value={expectedRevenueIncrease}
            onChange={(event) => onExpectedRevenueIncreaseChange(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="expectedCostReduction">Expected cost reduction (optional)</label>
          <input
            id="expectedCostReduction"
            name="expectedCostReduction"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Digits only"
            value={expectedCostReduction}
            onChange={(event) => onExpectedCostReductionChange(event.target.value)}
          />
        </div>

        <fieldset className="field multi-checkbox-field">
          <legend>Intangible or collateral benefits (optional)</legend>
          <p className="field-hint-text">Select one or more options.</p>
          <div className="multi-checkbox-list">
            {intangibleBenefitsOptions.map((option, index) => (
              <label key={option} className="multi-checkbox-item" htmlFor={`intangible-benefit-${index}`}>
                <input
                  id={`intangible-benefit-${index}`}
                  name="intangibleBenefits"
                  type="checkbox"
                  checked={intangibleBenefits.includes(option)}
                  onChange={(event) => onIntangibleBenefitsChange(option, event.target.checked)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <details className="system-prompt-details">
        <summary>System prompt</summary>
        <div className="field">
          <label htmlFor="systemPrompt">System prompt (optional)</label>
          <textarea
            id="systemPrompt"
            name="systemPrompt"
            className="system-prompt-textarea"
            value={systemPrompt}
            onChange={(event) => onSystemPromptChange(event.target.value)}
          />
        </div>
      </details>

      <div className="warning-box">
        <h3>Important</h3>
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
          <span>I understand and I removed sensitive information.</span>
        </label>
      </div>

      <div className="actions">
        <button type="button" className="primary-button" onClick={onAnalyze} disabled={!canAnalyze}>
          {isAnalyzing ? 'Asking AI...' : 'Ask AI to estimate value and choose the curve'}
        </button>

        {!hasConfiguredOpenRouterKey ? (
          <p className="status-message">AI suggestions are not available right now.</p>
        ) : null}

        {analysisError ? (
          <p className="field-error" role="alert">
            {analysisError}
          </p>
        ) : null}
      </div>

      <div className="field-grid field-grid--two">
        <ValueFields
          idPrefix="ai"
          projectValue={aiProjectValue}
          onProjectValueChange={onAiProjectValueChange}
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
            <ul className="ai-reasoning-list">
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
