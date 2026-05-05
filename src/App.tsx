import { useMemo, useState } from 'react'
import { AiScenario } from './components/AiScenario'
import { ManualScenario } from './components/ManualScenario'
import {
  analyzeCurveSuggestion,
  defaultAiSystemPrompt,
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
  { id: 'ai', label: 'AI assisted ✨' },
] satisfies Array<{ id: ScenarioTabId; label: string }>

const aiWarningItems = [
  'Your text is sent to external AI services.',
  'We cannot guarantee how your data is used, including possible model training.',
  'We cannot guarantee where your data is processed or stored geographically.',
  'Do not include names, secrets, or confidential information.',
  'No data is retained by this website.',
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
  const [aiSystemPrompt, setAiSystemPrompt] = useState(defaultAiSystemPrompt)
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
      setAnalysisError('AI suggestions are not available right now.')
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
        systemPrompt: aiSystemPrompt,
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

  function handleSystemPromptChange(value: string) {
    setAiSystemPrompt(value)
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
              systemPrompt={aiSystemPrompt}
              onSystemPromptChange={handleSystemPromptChange}
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
          . Built by{' '}
          <a href="https://micheleferracin.it" target="_blank" rel="noreferrer">
            Michele Ferracin
          </a>
          {' '}(&thinsp;
          <a href="https://www.linkedin.com/in/micheleferracin/" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          &thinsp;|&thinsp;
          <a
            href="https://github.com/phenixita/vpc"
            target="_blank"
            rel="noreferrer"
            className="attribution-icon-link"
            aria-label="GitHub repository"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="attribution-icon">
              <path
                fill="currentColor"
                d="M12 0.5C5.65 0.5 0.5 5.66 0.5 12.02c0 5.08 3.29 9.38 7.86 10.9.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.69.08-.69 1.16.08 1.77 1.2 1.77 1.2 1.03 1.78 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.07 0 0 .97-.31 3.17 1.18.92-.26 1.91-.39 2.89-.39s1.97.13 2.89.39c2.2-1.49 3.17-1.18 3.17-1.18.63 1.6.23 2.78.11 3.07.74.81 1.19 1.84 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.2 0 .31.21.68.79.56 4.56-1.52 7.85-5.83 7.85-10.9C23.5 5.66 18.35.5 12 .5Z"
              />
            </svg>
            GitHub
          </a>
          ).
        </footer>
      </div>
    </div>
  )
}

export default App
