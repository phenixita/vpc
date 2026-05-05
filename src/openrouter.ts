export type CurveId = 'might-as-well' | 'goldilocks'

export type CurveAnalysisResult = {
  curveId: CurveId
  summary: string
  reasoning: string[]
  modelRoute: string
}

const OPENROUTER_MODEL_ROUTE = 'openrouter/free'
const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim() ?? ''

type AnalyzeCurveRequest = {
  description: string
  acknowledgedWarning: boolean
}

type AnalyzeCurveSuggestionPayload = {
  curveId?: string
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

function isCurveId(value: unknown): value is CurveId {
  return value === 'might-as-well' || value === 'goldilocks'
}

export async function analyzeCurveSuggestion({
  description,
  acknowledgedWarning,
}: AnalyzeCurveRequest): Promise<CurveAnalysisResult> {
  if (!hasConfiguredOpenRouterKey) {
    throw new Error('AI is not configured for this deployment.')
  }

  if (!acknowledgedWarning) {
    throw new Error('You must confirm that you removed sensitive information before using AI analysis.')
  }

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
      messages: [
        {
          role: 'system',
          content: [
            'You are helping a value-based pricing calculator choose between two pricing curves.',
            'Curve options:',
            'might-as-well = Might As Well (MAW), safer, easier to close, lower risk, and naturally leans the buyer toward option 3.',
            'goldilocks = Goldilocks, bolder, higher-upside, premium-facing, and naturally leans the buyer toward option 2.',
            'Return ONLY valid JSON with the following shape:',
            '{"curveId":"might-as-well|goldilocks","summary":"one short sentence","reasoning":["short point","short point","short point"]}.',
            'Do not include markdown or any extra text.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Sanitized project brief:\n${description.trim()}`,
        },
      ],
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

  if (
    !suggestion ||
    !isCurveId(suggestion.curveId) ||
    typeof suggestion.summary !== 'string' ||
    suggestion.summary.trim().length === 0 ||
    reasoning.length === 0
  ) {
    throw new Error('The AI returned an unexpected response.')
  }

  return {
    curveId: suggestion.curveId,
    summary: suggestion.summary.trim(),
    reasoning,
    modelRoute:
      typeof suggestion.modelRoute === 'string' ? suggestion.modelRoute : OPENROUTER_MODEL_ROUTE,
  }
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
