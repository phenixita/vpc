import { useMemo, useState } from 'react'
import { analyzeCurveSuggestion, type CurveAnalysisResult, type CurveId } from './openrouter'
import './App.css'

type CurrencyCode = 'EUR' | 'USD' | 'GBP'
type ScenarioTabId = 'manual' | 'ai'

type CurveConfig = {
  id: CurveId
  name: string
  choiceLabel: string
  description: string
  outcome: string
  multipliers: [number, number, number]
  recommendedIndex: number
}

type PriceOption = {
  title: string
  amount: string
  multiplier: number
  description: string
  recommended: boolean
}

const OPENROUTER_MODEL_ROUTE = 'openrouter/free'
const MAX_PROJECT_BRIEF_LENGTH = 2000

const scenarioTabs: Array<{
  id: ScenarioTabId
  kicker: string
  title: string
  description: string
}> = [
  {
    id: 'manual',
    kicker: 'Manual',
    title: 'Choose the curve yourself',
    description:
      'Enter the project value, pick Campfire or Moonshot, and get the three proposal-ready prices instantly.',
  },
  {
    id: 'ai',
    kicker: 'AI',
    title: 'Let AI suggest the curve',
    description:
      'Share a sanitized project brief, keep the warning in place, and turn the suggested curve into prices.',
  },
]

const curves: CurveConfig[] = [
  {
    id: 'campfire',
    name: 'Campfire',
    choiceLabel: 'Campfire · keep it warm and easy',
    description:
      'A safer curve that helps you win the project without giving away too much upside.',
    outcome: 'This curve naturally nudges the buyer toward option 3.',
    multipliers: [0.1, 0.15, 0.175],
    recommendedIndex: 2,
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    choiceLabel: 'Moonshot · push for premium upside',
    description:
      'A more aggressive curve that increases upside and filters for higher-value buyers.',
    outcome: 'This curve naturally nudges the buyer toward option 2.',
    multipliers: [0.1, 0.22, 0.5],
    recommendedIndex: 1,
  },
]

const curveMap = Object.fromEntries(curves.map((curve) => [curve.id, curve])) as Record<
  CurveId,
  CurveConfig
>

const currencies: Record<CurrencyCode, { label: string; locale: string }> = {
  EUR: { label: 'Euro', locale: 'en-IE' },
  USD: { label: 'US Dollar', locale: 'en-US' },
  GBP: { label: 'Pound Sterling', locale: 'en-GB' },
}

const optionDescriptions = [
  'Starting point for the conversation.',
  'Balanced option with strong upside and manageable risk.',
  'Premium version designed to maximize perceived value and scope.',
]

const aiWarningItems = [
  'AI analysis uses OpenRouter’s free route, `openrouter/free`.',
  'OpenRouter chooses the underlying free model/provider at request time, so you do not fully control which service receives the request.',
  'Your project brief may be sent to third-party services and may be logged or used for model improvement or training.',
  'Remove personal, company, confidential, regulated, and otherwise sensitive information before sending anything for analysis.',
]

function parseProjectValue(rawValue: string): number | null {
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
    normalized =
      dotCount === 1 && digitsAfterDot <= 2 ? sanitized : sanitized.replace(/\./g, '')
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function formatMultiplier(multiplier: number) {
  return `${(multiplier * 100).toLocaleString('en-US', {
    maximumFractionDigits: 1,
  })}%`
}

function buildPriceOptions({
  formatter,
  parsedValue,
  selectedCurve,
}: {
  formatter: Intl.NumberFormat
  parsedValue: number | null
  selectedCurve: CurveConfig | null
}): PriceOption[] {
  if (!selectedCurve || !parsedValue) {
    return []
  }

  return selectedCurve.multipliers.map((multiplier, index) => ({
    title: `Option ${index + 1}`,
    amount: formatter.format(Math.floor(parsedValue * multiplier)),
    multiplier,
    description: optionDescriptions[index],
    recommended: index === selectedCurve.recommendedIndex,
  }))
}

type PricingFieldsSectionProps = {
  idPrefix: string
  projectValue: string
  onProjectValueChange: (value: string) => void
  currency: CurrencyCode
  onCurrencyChange: (currency: CurrencyCode) => void
  curveId: CurveId | ''
  onCurveChange: (curveId: CurveId | '') => void
  showValueError: boolean
}

function PricingFieldsSection({
  idPrefix,
  projectValue,
  onProjectValueChange,
  currency,
  onCurrencyChange,
  curveId,
  onCurveChange,
  showValueError,
}: PricingFieldsSectionProps) {
  const selectedCurve = curveId ? curveMap[curveId] : null

  return (
    <form
      className="calculator-form"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <div className="field">
        <label htmlFor={`${idPrefix}-projectValue`}>How much is this project worth to the client?</label>
        <input
          id={`${idPrefix}-projectValue`}
          name={`${idPrefix}-projectValue`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 100,000"
          value={projectValue}
          onChange={(event) => onProjectValueChange(event.target.value)}
        />
        <small>
          Use your best estimate of the client&apos;s perceived value. Separators like{' '}
          <strong>100,000</strong> and <strong>100.000</strong> both work.
        </small>
        {showValueError ? (
          <small className="field-error">Enter a valid amount greater than zero.</small>
        ) : null}
      </div>

      <div className="inline-grid">
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

        <div className="field">
          <label htmlFor={`${idPrefix}-curve`}>Selected pricing curve</label>
          <select
            id={`${idPrefix}-curve`}
            name={`${idPrefix}-curve`}
            value={curveId}
            onChange={(event) => onCurveChange(event.target.value as CurveId | '')}
          >
            <option value="">Choose a curve...</option>
            {curves.map((curve) => (
              <option key={curve.id} value={curve.id}>
                {curve.choiceLabel}
              </option>
            ))}
          </select>
          <small>
            This selection controls the pricing curve used to shape the three options.
          </small>
        </div>
      </div>

      <div className="curve-summary">
        <div className="curve-summary__title">
          <div>
            <p className="section-kicker">Selected curve</p>
            <h3>{selectedCurve?.name ?? 'Choose a curve'}</h3>
          </div>
          {selectedCurve ? <span className="curve-badge">{selectedCurve.name}</span> : null}
        </div>
        <p className="curve-summary__copy">
          {selectedCurve?.description ??
            'Choose a curve to control how the three pricing options behave.'}
        </p>
        <p className="curve-summary__outcome">
          {selectedCurve?.outcome ??
            'Each curve makes one of the three options feel naturally more attractive.'}
        </p>
        <div className="formula-list">
          {(selectedCurve?.multipliers ?? curves[0].multipliers).map((multiplier) => (
            <span className="formula-chip" key={`${idPrefix}-${multiplier}`}>
              {formatMultiplier(multiplier)}
            </span>
          ))}
        </div>
      </div>
    </form>
  )
}

type ResultsPanelProps = {
  scenarioName: string
  parsedValue: number | null
  formatter: Intl.NumberFormat
  priceOptions: PriceOption[]
  emptyStateCopy: string
}

function ResultsPanel({
  scenarioName,
  parsedValue,
  formatter,
  priceOptions,
  emptyStateCopy,
}: ResultsPanelProps) {
  return (
    <section className="panel results-panel" aria-live="polite">
      <div className="results-header">
        <div>
          <p className="section-kicker">Output</p>
          <h2>Project Price Options</h2>
          <p className="results-copy">
            Three pricing tiers generated from client value, ready to pair with different scope
            levels.
          </p>
        </div>

        <div className="pill-row">
          <span className="status-pill">{scenarioName}</span>
          {parsedValue ? (
            <div className="value-chip">
              Client value <strong>{formatter.format(parsedValue)}</strong>
            </div>
          ) : null}
        </div>
      </div>

      {priceOptions.length > 0 ? (
        <div className="price-grid">
          {priceOptions.map((option) => (
            <article key={option.title} className={`result-card${option.recommended ? ' recommended' : ''}`}>
              <div className="result-card__header">
                <div>
                  <p className="result-card__eyebrow">{option.title}</p>
                  <div className="result-card__amount">{option.amount}</div>
                </div>
                <span className="formula-chip">{formatMultiplier(option.multiplier)}</span>
              </div>
              <p className="result-card__description">{option.description}</p>
              {option.recommended ? (
                <span className="result-card__badge">Best fit for this curve</span>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Fill in the inputs to see the price options</h3>
          <p>{emptyStateCopy}</p>
        </div>
      )}

      <p className="helper-copy">
        Once you have the prices, assign a scope to each option that you would be happy to deliver.
      </p>
    </section>
  )
}

function CurveLibrarySection() {
  return (
    <section className="panel curve-library">
      <div className="panel-heading">
        <p className="section-kicker">Reference</p>
        <h2>How to read the curves</h2>
      </div>

      <div className="curve-card-grid">
        {curves.map((curve) => (
          <article className="curve-card" key={curve.id}>
            <div className="curve-card__header">
              <h3>{curve.name}</h3>
              <span className="curve-badge">{curve.choiceLabel}</span>
            </div>
            <p>{curve.description}</p>
            <p className="curve-card__outcome">{curve.outcome}</p>
            <div className="formula-list">
              {curve.multipliers.map((multiplier) => (
                <span className="formula-chip" key={`${curve.id}-${multiplier}`}>
                  {formatMultiplier(multiplier)}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className="helper-copy">
        Use the multipliers as pricing anchors, then attach a clear scope to each option.
      </p>
    </section>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState<ScenarioTabId>('manual')
  const [manualProjectValue, setManualProjectValue] = useState('')
  const [manualCurveId, setManualCurveId] = useState<CurveId | ''>('')
  const [manualCurrency, setManualCurrency] = useState<CurrencyCode>('EUR')
  const [aiProjectValue, setAiProjectValue] = useState('')
  const [aiCurveId, setAiCurveId] = useState<CurveId | ''>('')
  const [aiCurrency, setAiCurrency] = useState<CurrencyCode>('EUR')
  const [projectBrief, setProjectBrief] = useState('')
  const [hasSanitizedBrief, setHasSanitizedBrief] = useState(false)
  const [analysis, setAnalysis] = useState<CurveAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const activeProjectValue = activeTab === 'manual' ? manualProjectValue : aiProjectValue
  const activeCurveId = activeTab === 'manual' ? manualCurveId : aiCurveId
  const activeCurrency = activeTab === 'manual' ? manualCurrency : aiCurrency

  const parsedValue = useMemo(() => parseProjectValue(activeProjectValue), [activeProjectValue])
  const selectedCurve = activeCurveId ? curveMap[activeCurveId] : null
  const showValueError = activeProjectValue.trim() !== '' && parsedValue === null
  const briefLength = projectBrief.trim().length
  const showBriefError = projectBrief.trim() !== '' && briefLength < 30
  const remainingCharacters = MAX_PROJECT_BRIEF_LENGTH - projectBrief.length
  const canAnalyze = briefLength >= 30 && hasSanitizedBrief && !isAnalyzing

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(currencies[activeCurrency].locale, {
        style: 'currency',
        currency: activeCurrency,
        maximumFractionDigits: 0,
      }),
    [activeCurrency],
  )

  const priceOptions = useMemo(
    () =>
      buildPriceOptions({
        formatter,
        parsedValue,
        selectedCurve,
      }),
    [formatter, parsedValue, selectedCurve],
  )

  async function handleAnalyzeWithAi() {
    if (!canAnalyze) {
      return
    }

    setIsAnalyzing(true)
    setAnalysisError('')

    try {
      const result = await analyzeCurveSuggestion({
        description: projectBrief.trim(),
        acknowledgedWarning: hasSanitizedBrief,
      })

      setAnalysis(result)
      setAiCurveId(result.curveId)
      setActiveTab('ai')
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : 'The AI analysis failed unexpectedly.',
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="page">
      <div className="app-shell">
        <header className="hero-panel">
          <span className="eyebrow">Value-based pricing calculator</span>
          <h1>Value Pricing Calculator</h1>
          <p className="hero-copy">
            Work in two dedicated flows: pick the pricing curve yourself or let AI suggest one,
            then turn the result into three proposal-ready price points.
          </p>
        </header>

        <section className="panel tabs-panel">
          <div className="panel-heading">
            <p className="section-kicker">Scenarios</p>
            <h2>Choose how you want to work</h2>
            <p className="helper-copy">
              The manual tab stays fully hands-on. The AI tab keeps the warning in place, asks for
              a sanitized brief, and still lets you override the suggested curve.
            </p>
          </div>

          <div className="tab-list" role="tablist" aria-label="Pricing scenarios">
            {scenarioTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                id={`${tab.id}-tab`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                className={`tab-button${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="section-kicker">{tab.kicker}</span>
                <span className="tab-button__title">{tab.title}</span>
                <span className="tab-button__copy">{tab.description}</span>
              </button>
            ))}
          </div>
        </section>

        <main className="calculator-grid">
          <section
            className="panel scenario-panel"
            id={`${activeTab}-panel`}
            role="tabpanel"
            aria-labelledby={`${activeTab}-tab`}
          >
            {activeTab === 'manual' ? (
              <>
                <div className="panel-heading">
                  <p className="section-kicker">Manual calculation</p>
                  <h2>Choose the curve and price the project</h2>
                  <p className="helper-copy">
                    Estimate the client value, select the pricing curve yourself, and see the three
                    pricing anchors immediately.
                  </p>
                </div>

                <PricingFieldsSection
                  idPrefix="manual"
                  projectValue={manualProjectValue}
                  onProjectValueChange={setManualProjectValue}
                  currency={manualCurrency}
                  onCurrencyChange={setManualCurrency}
                  curveId={manualCurveId}
                  onCurveChange={setManualCurveId}
                  showValueError={showValueError}
                />

                <div className="settings-card">
                  <div className="settings-card__copy">
                    <p className="section-kicker">Manual flow</p>
                    <h3>No AI step required</h3>
                    <p>
                      Pick <strong>Campfire</strong> when you want the safer close. Pick{' '}
                      <strong>Moonshot</strong> when you want stronger upside and a more premium
                      posture.
                    </p>
                  </div>

                  <div className="pill-row">
                    <span className="status-pill">Fully manual curve choice</span>
                    <span className="status-pill">Instant pricing output</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="panel-heading">
                  <p className="section-kicker">AI assistant</p>
                  <h2>Ask AI to suggest the best curve</h2>
                  <p className="helper-copy">
                    Share a high-level, sanitized project brief and let AI recommend whether
                    <strong> Campfire</strong> or <strong>Moonshot</strong> fits better.
                  </p>
                </div>

                <div className="ai-assistant">
                  <div className="settings-card">
                    <div className="settings-card__copy">
                      <p className="section-kicker">Shared AI route</p>
                      <h3>No browser API key required</h3>
                      <p>
                        The browser only sends the sanitized brief. The shared OpenRouter key stays
                        in Firebase-managed server-side configuration.
                      </p>
                    </div>

                    <div className="pill-row">
                      <span className="status-pill">Model route: {OPENROUTER_MODEL_ROUTE}</span>
                      <span className="status-pill">Served through Firebase</span>
                    </div>
                  </div>

                  <div className="field">
                    <div className="field-header">
                      <label htmlFor="projectBrief">Sanitized project brief</label>
                      <span
                        className={`character-count${remainingCharacters < 250 ? ' low' : ''}`}
                      >
                        {remainingCharacters} characters left
                      </span>
                    </div>
                    <textarea
                      id="projectBrief"
                      name="projectBrief"
                      placeholder="Example: A six-week client portal redesign for a mid-market SaaS team. The work touches onboarding, billing visibility, and approval flows. The buyer wants a fast win but also sees strong upside if adoption improves."
                      maxLength={MAX_PROJECT_BRIEF_LENGTH}
                      value={projectBrief}
                      onChange={(event) => setProjectBrief(event.target.value)}
                    />
                    <small>
                      Focus on goals, urgency, complexity, scope, and upside. Do not include private
                      names, internal metrics, customer lists, or confidential plans.
                    </small>
                    {showBriefError ? (
                      <small className="field-error">
                        Write at least 30 characters so the AI has enough context to work with.
                      </small>
                    ) : null}
                  </div>

                  <div className="warning-card">
                    <p className="section-kicker">Mandatory warning</p>
                    <h3>Remove sensitive information before using AI</h3>
                    <ul className="warning-list">
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
                        onChange={(event) => setHasSanitizedBrief(event.target.checked)}
                      />
                      <span>
                        I removed personal, company, confidential, and sensitive information from
                        this brief before sending it to AI.
                      </span>
                    </label>
                  </div>

                  <div className="button-row">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleAnalyzeWithAi}
                      disabled={!canAnalyze}
                    >
                      {isAnalyzing ? 'Analyzing project…' : 'Ask AI for a curve suggestion'}
                    </button>
                    <p className="status-note">
                      The AI suggestion auto-selects the curve in this tab, but you can still
                      override it manually.
                    </p>
                  </div>

                  {analysisError ? (
                    <div className="error-card" role="alert">
                      <h3>AI analysis failed</h3>
                      <p>{analysisError}</p>
                    </div>
                  ) : null}

                  {analysis ? (
                    <div className="analysis-card">
                      <div className="analysis-card__header">
                        <div>
                          <p className="section-kicker">AI suggestion</p>
                          <h3>{curveMap[analysis.curveId].name}</h3>
                        </div>
                        <span className="curve-badge">Applied to AI pricing</span>
                      </div>
                      <p className="analysis-card__summary">{analysis.summary}</p>
                      <ul className="analysis-list">
                        {analysis.reasoning.map((reason, index) => (
                          <li key={`${reason}-${index}`}>{reason}</li>
                        ))}
                      </ul>
                      <p className="helper-copy">
                        Routed through <strong>{analysis.modelRoute}</strong>. You can change the
                        curve manually at any time.
                      </p>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <h3>No AI suggestion yet</h3>
                      <p>
                        Add a sanitized project brief and confirm the warning to get a curve
                        recommendation.
                      </p>
                    </div>
                  )}

                  <div className="pricing-block">
                    <div className="subsection-heading">
                      <p className="section-kicker">Pricing inputs</p>
                      <h3>Turn the suggested curve into prices</h3>
                      <p className="helper-copy">
                        Add the project value and currency for this AI scenario. You can also adjust
                        the curve manually after the suggestion arrives.
                      </p>
                    </div>

                    <PricingFieldsSection
                      idPrefix="ai"
                      projectValue={aiProjectValue}
                      onProjectValueChange={setAiProjectValue}
                      currency={aiCurrency}
                      onCurrencyChange={setAiCurrency}
                      curveId={aiCurveId}
                      onCurveChange={setAiCurveId}
                      showValueError={showValueError}
                    />
                  </div>
                </div>
              </>
            )}
          </section>

          <ResultsPanel
            scenarioName={activeTab === 'manual' ? 'Manual tab' : 'AI tab'}
            parsedValue={parsedValue}
            formatter={formatter}
            priceOptions={priceOptions}
            emptyStateCopy={
              activeTab === 'manual'
                ? 'Enter the project value and choose a curve to see the price options.'
                : 'Add the project value and ask AI for a curve suggestion, or choose a curve manually in this tab.'
            }
          />
        </main>

        <CurveLibrarySection />
      </div>
    </div>
  )
}

export default App
