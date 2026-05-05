import { useMemo, useState } from 'react'
import { AiScenario } from './components/AiScenario'
import { ManualScenario } from './components/ManualScenario'
import {
  analyzeCurveSuggestion,
  hasConfiguredOpenRouterKey,
  type CurveAnalysisResult,
  type CurveId,
} from './openrouter'
import {
  buildPriceTiers,
  createCurrencyFormatter,
  curveMap,
  curves,
  formatPerceivedValueForInput,
  parseProjectValue,
  type CurrencyCode,
} from './pricing'
import './App.css'

type ScenarioTabId = 'manual' | 'ai'

const MAX_PROJECT_BRIEF_LENGTH = 5000

const scenarioTabs = [
  { id: 'manual', label: 'Manual' },
  { id: 'ai', label: 'AI' },
] satisfies Array<{ id: ScenarioTabId; label: string }>

const aiWarningItems = [
  'The prompt is sent through OpenRouter’s free route.',
  'The underlying provider may change from one request to another.',
  'Do not send names, secrets, or confidential information.',
]

function App() {
  const [activeTab, setActiveTab] = useState<ScenarioTabId>('manual')
  const [manualProjectValue, setManualProjectValue] = useState('')
  const [manualCurrency, setManualCurrency] = useState<CurrencyCode>('EUR')
  const [manualCurveId, setManualCurveId] = useState<CurveId | ''>('')

  const [aiProjectValue, setAiProjectValue] = useState('')
  const [aiCurrency, setAiCurrency] = useState<CurrencyCode>('EUR')
  const [aiAnalysis, setAiAnalysis] = useState<CurveAnalysisResult | null>(null)
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
  const aiCurve = aiAnalysis ? curveMap[aiAnalysis.curveId] : null
  const aiSuggestedPerceivedValue =
    aiAnalysis && Number.isFinite(aiAnalysis.perceivedValue)
      ? aiFormatter.format(Math.floor(aiAnalysis.perceivedValue))
      : ''

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
    setAiAnalysis(null)

    try {
      const result = await analyzeCurveSuggestion({
        description: projectBrief.trim(),
        acknowledgedWarning: hasSanitizedBrief,
      })

      setAiAnalysis(result)
      setAiProjectValue(formatPerceivedValueForInput(result.perceivedValue))
    } catch (error) {
      setAiAnalysis(null)
      setAnalysisError(error instanceof Error ? error.message : 'The AI analysis failed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function handleProjectBriefChange(value: string) {
    setProjectBrief(value)
    setAiAnalysis(null)
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
            <ManualScenario
              manualProjectValue={manualProjectValue}
              onManualProjectValueChange={setManualProjectValue}
              manualCurrency={manualCurrency}
              onManualCurrencyChange={setManualCurrency}
              showManualValueError={showManualValueError}
              manualCurveId={manualCurveId}
              onManualCurveChange={setManualCurveId}
              manualCurve={manualCurve}
              manualTiers={manualTiers}
              curves={curves}
            />
          ) : (
            <AiScenario
              projectBrief={projectBrief}
              maxProjectBriefLength={MAX_PROJECT_BRIEF_LENGTH}
              onProjectBriefChange={handleProjectBriefChange}
              canAnalyze={canAnalyze}
              isAnalyzing={isAnalyzing}
              onAnalyze={handleAnalyzeWithAi}
              hasConfiguredOpenRouterKey={hasConfiguredOpenRouterKey}
              analysisError={analysisError}
              aiWarningItems={aiWarningItems}
              hasSanitizedBrief={hasSanitizedBrief}
              onSanitizedBriefChange={(isChecked) => {
                setHasSanitizedBrief(isChecked)
                setAnalysisError('')
              }}
              aiProjectValue={aiProjectValue}
              onAiProjectValueChange={setAiProjectValue}
              aiCurrency={aiCurrency}
              onAiCurrencyChange={setAiCurrency}
              showAiValueError={showAiValueError}
              aiAnalysis={aiAnalysis}
              aiCurve={aiCurve}
              aiSuggestedPerceivedValue={aiSuggestedPerceivedValue}
              aiTiers={aiTiers}
              aiEmptyMessage={aiEmptyMessage}
            />
          )}
        </main>

        <footer className="attribution">
          Based on{' '}
          <a href="https://jonathanstark.com/vpc/" target="_blank" rel="noreferrer">
            Jonathan Stark&apos;s Value Pricing Calculator
          </a>
          .
        </footer>
      </div>
    </div>
  )
}

export default App
