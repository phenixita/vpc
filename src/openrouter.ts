export type CurveId = 'might-as-well' | 'goldilocks'

export type CurveAnalysisResult = {
  curveId: CurveId
  perceivedValue: number
  summary: string
  reasoning: string[]
  modelRoute: string
}

const OPENROUTER_MODEL_ROUTE = 'openrouter/free'
const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim() ?? ''

type AnalyzeCurveRequest = {
  description: string
  acknowledgedWarning: boolean
  systemPrompt?: string
  companyRevenue?: string
  influencedPeople?: string
  expectedRevenueIncrease?: string
  expectedCostReduction?: string
  intangibleBenefits?: string[]
}

type AnalyzeCurveSuggestionPayload = {
  curveId?: string
  perceivedValue?: unknown
  summary?: string
  reasoning?: unknown
  modelRoute?: string
  error?: string
}

type OpenRouterMessage = {
  content?: unknown
  reasoning?: unknown
  reasoning_content?: unknown
  reasoning_details?: unknown
}

type OpenRouterApiResponse = {
  choices?: Array<{
    message?: OpenRouterMessage
  }>
  error?: string | { message?: string }
}

export const hasConfiguredOpenRouterKey = openRouterApiKey.length > 0

const AI_SYSTEM_PROMPT_LOCKED_PREFIX = [
  'You are an expert in value-based pricing.',
  '',
  'Your role is to interpret commercial and consulting proposals through the lens of perceived client value rather than effort, hours worked, internal cost, or volume of deliverables.',
  '',
  'You think like a senior advisor focused on value:',
  '- You prioritize results, business impact, strategic relevance, and meaningful change for the client.',
  '- You do not treat hours, days, task lists, or delivery volume as the primary indicators of worth.',
  '- You view pricing as something that should reflect the client\'s perceived value of the outcome, not the supplier\'s effort.',
  '- You pay close attention to whether the proposal speaks to decision-makers with economic responsibility, not only operational or technical stakeholders.',
  '- You distinguish clearly between what is being done and why it matters.',
  '',
  'Foundational principles:',
  '1. Value matters more than time.',
  '2. Results matter more than activities.',
  '3. Business outcomes matter more than deliverables.',
  '4. Pricing should reflect perceived client value.',
  '5. A strong proposal makes impact, urgency, and expected gains visible.',
  '6. A strong proposal speaks to the economic buyer, not only to users or technical stakeholders.',
  '7. If price is disconnected from outcomes, the proposal is weak.',
  '8. If the proposal explains the work in detail but not the change it creates, perceived value is low.',
  '9. Reducing price without reducing scope or value is a sign of commercial weakness.',
  '10. The more concretely a proposal expresses expected return, strategic gain, risk reduction, or opportunity creation, the stronger the perceived value.',
  '',
  'Operating mindset:',
  '- Always focus on the value created for the client.',
  '- Treat effort, process, and deliverables as secondary unless they are clearly connected to outcomes.',
  '- Do not assume value is obvious unless it is explicitly expressed or strongly implied.',
  '- Keep attention on impact, transformation, relevance, and investment logic.',
  '- Maintain a distinction between service execution and client value.',
  '- Think in terms of business improvement, strategic advantage, and decision justification.',
].join('\n')

export const defaultAiSystemPrompt = [
  'You are helping a value-based pricing calculator choose between two pricing curves.',
  'Curve options:',
  'might-as-well = "I want to land it really bad!" - safer, easier to close, lower risk, naturally leans the buyer toward option 3.',
  'goldilocks = "Meh, I don\'t really care" - bolder, higher-upside, premium-facing, naturally leans the buyer toward option 2.',
].join(' ')

const AI_SYSTEM_PROMPT_LOCKED_SUFFIX = [
  'Return ONLY valid JSON with the following shape:',
  '{"curveId":"might-as-well|goldilocks","perceivedValue":123456,"summary":"one short sentence","reasoning":["short point","short point","short point"]}.',
  'perceivedValue must be a positive number in the client currency context, without symbols, ranges, or text.',
  'Do not include markdown or any extra text.',
].join(' ')

function isCurveId(value: unknown): value is CurveId {
  return value === 'might-as-well' || value === 'goldilocks'
}

export async function analyzeCurveSuggestion({
  description,
  acknowledgedWarning,
  systemPrompt,
  companyRevenue,
  influencedPeople,
  expectedRevenueIncrease,
  expectedCostReduction,
  intangibleBenefits,
}: AnalyzeCurveRequest): Promise<CurveAnalysisResult> {
  if (!hasConfiguredOpenRouterKey) {
    throw new Error('AI is not configured for this deployment.')
  }

  if (!acknowledgedWarning) {
    throw new Error('You must confirm that you removed sensitive information before using AI analysis.')
  }

  const promptBase = systemPrompt?.trim() || defaultAiSystemPrompt
  const normalizedSystemPrompt = `${AI_SYSTEM_PROMPT_LOCKED_PREFIX}\n\n${promptBase}\n\n${AI_SYSTEM_PROMPT_LOCKED_SUFFIX}`.trim()
  const userContent = buildUserContent({
    description,
    companyRevenue,
    influencedPeople,
    expectedRevenueIncrease,
    expectedCostReduction,
    intangibleBenefits,
  })
  const messages = [
    {
      role: 'system',
      content: normalizedSystemPrompt,
    },
    {
      role: 'user',
      content: userContent,
    },
  ]

  console.log('OpenRouter full prompt:', messages)

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Value Pricing Calculator',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL_ROUTE,
      temperature: 0.2,
      reasoning: {
        enabled: true,
      },
      messages,
    }),
  })

  const payload = (await response.json().catch(() => null)) as OpenRouterApiResponse | null

  if (!response.ok) {
    throw new Error(extractOpenRouterError(payload))
  }

  const message = payload?.choices?.[0]?.message
  const content = message?.content

  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('OpenRouter returned an empty response.')
  }

  const suggestion = parseSuggestionContent(content)
  const nativeReasoning = extractReasoningFromMessage(message)
  const structuredReasoning = Array.isArray(suggestion?.reasoning)
    ? suggestion.reasoning.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const reasoning = (nativeReasoning.length > 0 ? nativeReasoning : structuredReasoning).slice(0, 5)
  const perceivedValue = parsePerceivedValue(suggestion?.perceivedValue)

  if (
    !suggestion ||
    !isCurveId(suggestion.curveId) ||
    perceivedValue === null ||
    typeof suggestion.summary !== 'string' ||
    suggestion.summary.trim().length === 0 ||
    reasoning.length === 0
  ) {
    throw new Error('The AI returned an unexpected response.')
  }

  return {
    curveId: suggestion.curveId,
    perceivedValue,
    summary: suggestion.summary.trim(),
    reasoning,
    modelRoute:
      typeof suggestion.modelRoute === 'string' ? suggestion.modelRoute : OPENROUTER_MODEL_ROUTE,
  }
}

function buildUserContent({
  description,
  companyRevenue,
  influencedPeople,
  expectedRevenueIncrease,
  expectedCostReduction,
  intangibleBenefits,
}: {
  description: string
  companyRevenue?: string
  influencedPeople?: string
  expectedRevenueIncrease?: string
  expectedCostReduction?: string
  intangibleBenefits?: string[]
}) {
  const normalizedIntangibleBenefits =
    intangibleBenefits
      ?.map((item) => item.trim())
      .filter((item) => item.length > 0)
      .join(', ') ?? ''

  const optionalEntries: Array<[label: string, value: string | undefined]> = [
    ['Company revenue', companyRevenue],
    ['People impacted by the project', influencedPeople],
    ['Expected revenue increase', expectedRevenueIncrease],
    ['Expected cost reduction', expectedCostReduction],
    ['Intangible or collateral benefits', normalizedIntangibleBenefits],
  ]

  const optionalLines = optionalEntries
    .map(([label, value]) => {
      const normalizedValue = value?.trim()
      if (!normalizedValue) {
        return ''
      }

      return `${label}: ${normalizedValue}`
    })
    .filter(Boolean)

  if (optionalLines.length === 0) {
    return `Sanitized project brief:\n${description.trim()}`
  }

  return [`Sanitized project brief:\n${description.trim()}`, 'Guided context (optional):', ...optionalLines].join('\n\n')
}

function parsePerceivedValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const numericValue = Number.parseFloat(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null
}

function extractOpenRouterError(payload: OpenRouterApiResponse | null) {
  if (typeof payload?.error === 'string' && payload.error.trim().length > 0) {
    return payload.error
  }

  const nestedError =
    payload?.error && typeof payload.error === 'object' ? payload.error.message : undefined

  if (typeof nestedError === 'string' && nestedError.trim().length > 0) {
    return nestedError
  }

  return 'The AI analysis failed.'
}

function parseSuggestionContent(content: string): AnalyzeCurveSuggestionPayload | null {
  const firstBraceIndex = content.indexOf('{')
  const lastBraceIndex = content.lastIndexOf('}')

  if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex <= firstBraceIndex) {
    return null
  }

  try {
    return JSON.parse(content.slice(firstBraceIndex, lastBraceIndex + 1)) as AnalyzeCurveSuggestionPayload
  } catch {
    return null
  }
}

function extractReasoningFromMessage(message: OpenRouterMessage | undefined): string[] {
  const reasoning: string[] = []

  appendReasoningEntries(reasoning, message?.reasoning)
  appendReasoningEntries(reasoning, message?.reasoning_content)
  appendReasoningEntries(reasoning, message?.reasoning_details)

  return reasoning
}

function appendReasoningEntries(target: string[], value: unknown) {
  if (typeof value === 'string') {
    appendReasoningLines(target, value)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendReasoningEntries(target, item))
    return
  }

  if (!value || typeof value !== 'object') {
    return
  }

  const record = value as Record<string, unknown>

  if (typeof record.text === 'string') {
    appendReasoningLines(target, record.text)
  }

  if (typeof record.reasoning === 'string') {
    appendReasoningLines(target, record.reasoning)
  }

  if (typeof record.summary === 'string') {
    appendReasoningLines(target, record.summary)
  }

  if (Array.isArray(record.summary)) {
    record.summary.forEach((item) => appendReasoningEntries(target, item))
  }
}

function appendReasoningLines(target: string[], text: string) {
  const entries = text
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)

  if (entries.length === 0) {
    return
  }

  entries.forEach((entry) => {
    if (!target.includes(entry)) {
      target.push(entry)
    }
  })
}
