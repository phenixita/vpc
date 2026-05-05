import { useMemo, useState } from 'react'
import { analyzeCurveSuggestion, hasConfiguredOpenRouterKey, type CurveId } from './openrouter'
import './App.css'

type CurrencyCode = 'EUR' | 'USD' | 'GBP'
type ScenarioTabId = 'manual' | 'ai'

type CurveConfig = {
  id: CurveId
  name: string
  multipliers: [number, number, number]
}

type PriceTier = {
  label: string
  amount: string
  multiplierLabel: string
}

const MAX_PROJECT_BRIEF_LENGTH = 2000

const scenarioTabs = [
  { id: 'manual', label: 'Manual' },
  { id: 'ai', label: 'AI' },
] satisfies Array<{ id: ScenarioTabId; label: string }>

const curves: CurveConfig[] = [
  {
    id: 'campfire',
    name: 'Campfire',
    multipliers: [0.1, 0.15, 0.175],
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    multipliers: [0.1, 0.22, 0.5],
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

const aiWarningItems = [
  'The prompt is sent through OpenRouter’s free route.',
  'The underlying provider may change from one request to another.',
  'Do not send names, secrets, or confidential information.',
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

function createCurrencyFormatter(currency: CurrencyCode) {
  return new Intl.NumberFormat(currencies[currency].locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })
}

function buildPriceTiers({
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

type ValueFieldsProps = {
  idPrefix: string
  projectValue: string
  onProjectValueChange: (value: string) => void
  currency: CurrencyCode
  onCurrencyChange: (currency: CurrencyCode) => void
  showValueError: boolean
}

function ValueFields({
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

type PriceResultsProps = {
  curve: CurveConfig | null
  title: string
  tiers: PriceTier[]
  emptyMessage: string
}

function PriceResults({ curve, title, tiers, emptyMessage }: PriceResultsProps) {
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

function App() {
  const [activeTab, setActiveTab] = useState<ScenarioTabId>('manual')
  const [manualProjectValue, setManualProjectValue] = useState('')
  const [manualCurrency, setManualCurrency] = useState<CurrencyCode>('EUR')
  const [manualCurveId, setManualCurveId] = useState<CurveId | ''>('')

  const [aiProjectValue, setAiProjectValue] = useState('')
  const [aiCurrency, setAiCurrency] = useState<CurrencyCode>('EUR')
  const [aiCurveId, setAiCurveId] = useState<CurveId | ''>('')
  const [projectBrief, setProjectBrief] = useState('')
  const [hasSanitizedBrief, setHasSanitizedBrief] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const manualParsedValue = useMemo(
    () => parseProjectValue(manualProjectValue),
    [manualProjectValue],
  )
  const aiParsedValue = useMemo(() => parseProjectValue(aiProjectValue), [aiProjectValue])

  const manualFormatter = useMemo(() => createCurrencyFormatter(manualCurrency), [manualCurrency])
  const aiFormatter = useMemo(() => createCurrencyFormatter(aiCurrency), [aiCurrency])

  const manualCurve = manualCurveId ? curveMap[manualCurveId] : null
  const aiCurve = aiCurveId ? curveMap[aiCurveId] : null

  const manualTiers = useMemo(
    () =>
      buildPriceTiers({
        formatter: manualFormatter,
        parsedValue: manualParsedValue,
        selectedCurve: manualCurve,
      }),
    [manualFormatter, manualParsedValue, manualCurve],
  )

  const aiTiers = useMemo(
    () =>
      buildPriceTiers({
        formatter: aiFormatter,
        parsedValue: aiParsedValue,
        selectedCurve: aiCurve,
      }),
    [aiFormatter, aiParsedValue, aiCurve],
  )

  const showManualValueError = manualProjectValue.trim() !== '' && manualParsedValue === null
  const showAiValueError = aiProjectValue.trim() !== '' && aiParsedValue === null
  const canAnalyze =
    hasConfiguredOpenRouterKey && projectBrief.trim().length > 0 && hasSanitizedBrief && !isAnalyzing

  async function handleAnalyzeWithAi() {
    if (!hasConfiguredOpenRouterKey) {
      setAnalysisError('AI is unavailable until VITE_OPENROUTER_API_KEY is configured.')
      return
    }

    if (!projectBrief.trim()) {
      setAnalysisError('Enter a prompt before asking AI.')
      return
    }

    if (!hasSanitizedBrief) {
      setAnalysisError('Confirm the warning before asking AI.')
      return
    }

    setIsAnalyzing(true)
    setAnalysisError('')

    try {
      const result = await analyzeCurveSuggestion({
        description: projectBrief.trim(),
        acknowledgedWarning: hasSanitizedBrief,
      })

      setAiCurveId(result.curveId)
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'The AI analysis failed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function handleProjectBriefChange(value: string) {
    setProjectBrief(value)
    setAiCurveId('')
    setAnalysisError('')
  }

  const aiEmptyMessage = aiCurve
    ? 'Enter the perceived value to calculate the 3 price tiers.'
    : 'Write a prompt, confirm the warning, and ask AI to choose the curve.'

  return (
    <div className="app">
      <div className="shell">
        <header className="header">
          <h1>Value Pricing Calculator</h1>
        </header>

        <div className="tabs" role="tablist" aria-label="Pricing scenarios">
          {scenarioTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              id={`${tab.id}-tab`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              className={`tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <main className="panel">
          {activeTab === 'manual' ? (
            <section
              className="scenario"
              id="manual-panel"
              role="tabpanel"
              aria-labelledby="manual-tab"
            >
              <div className="field-grid field-grid--three">
                <ValueFields
                  idPrefix="manual"
                  projectValue={manualProjectValue}
                  onProjectValueChange={setManualProjectValue}
                  currency={manualCurrency}
                  onCurrencyChange={setManualCurrency}
                  showValueError={showManualValueError}
                />

                <div className="field field--curve">
                  <label htmlFor="manual-curve">Price curve</label>
                  <select
                    id="manual-curve"
                    name="manual-curve"
                    value={manualCurveId}
                    onChange={(event) => setManualCurveId(event.target.value as CurveId | '')}
                  >
                    <option value="">Choose...</option>
                    {curves.map((curve) => (
                      <option key={curve.id} value={curve.id}>
                        {curve.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <PriceResults
                curve={manualCurve}
                title="3 price tiers"
                tiers={manualTiers}
                emptyMessage="Enter the perceived value and choose a curve."
              />
            </section>
          ) : (
            <section className="scenario" id="ai-panel" role="tabpanel" aria-labelledby="ai-tab">
              <div className="field">
                <div className="field-header">
                  <label htmlFor="projectBrief">Prompt</label>
                  <span className="character-count">
                    {projectBrief.length} / {MAX_PROJECT_BRIEF_LENGTH}
                  </span>
                </div>
                <textarea
                  id="projectBrief"
                  name="projectBrief"
                  maxLength={MAX_PROJECT_BRIEF_LENGTH}
                  placeholder="Describe the project, value, urgency, risk, and upside."
                  value={projectBrief}
                  onChange={(event) => handleProjectBriefChange(event.target.value)}
                />
              </div>

              <div className="field-grid field-grid--two">
                <ValueFields
                  idPrefix="ai"
                  projectValue={aiProjectValue}
                  onProjectValueChange={setAiProjectValue}
                  currency={aiCurrency}
                  onCurrencyChange={setAiCurrency}
                  showValueError={showAiValueError}
                />
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
                    onChange={(event) => {
                      setHasSanitizedBrief(event.target.checked)
                      setAnalysisError('')
                    }}
                  />
                  <span>I confirmed the prompt is sanitized.</span>
                </label>
              </div>

              <div className="actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleAnalyzeWithAi}
                  disabled={!canAnalyze}
                >
                  {isAnalyzing ? 'Asking AI...' : 'Ask AI to choose the curve'}
                </button>

                {!hasConfiguredOpenRouterKey ? (
                  <p className="status-message">
                    AI is unavailable until VITE_OPENROUTER_API_KEY is configured.
                  </p>
                ) : null}

                {analysisError ? (
                  <p className="field-error" role="alert">
                    {analysisError}
                  </p>
                ) : null}
              </div>

              <PriceResults
                curve={aiCurve}
                title="3 price tiers"
                tiers={aiTiers}
                emptyMessage={aiEmptyMessage}
              />
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
