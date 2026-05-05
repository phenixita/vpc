export type CurveId = 'campfire' | 'moonshot'

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

type OpenRouterApiResponse = {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
  error?: string | { message?: string }
}

export const hasConfiguredOpenRouterKey = openRouterApiKey.length > 0

function isCurveId(value: unknown): value is CurveId {
  return value === 'campfire' || value === 'moonshot'
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
      messages: [
        {
          role: 'system',
          content: [
            'You are helping a value-based pricing calculator choose between two pricing curves.',
            'Curve options:',
            'campfire = safer, easier to close, lower risk, the buyer naturally leans toward option 3.',
            'moonshot = bolder, higher-upside, premium-facing, the buyer naturally leans toward option 2.',
            'Return ONLY valid JSON with the following shape:',
            '{"curveId":"campfire|moonshot","summary":"one short sentence","reasoning":["short point","short point","short point"]}.',
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

  const content = payload?.choices?.[0]?.message?.content

  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('OpenRouter returned an empty response.')
  }

  const suggestion = parseSuggestionContent(content)

  const reasoning = Array.isArray(suggestion?.reasoning)
    ? suggestion.reasoning.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

  if (
    !suggestion ||
    !isCurveId(suggestion.curveId) ||
    typeof suggestion.summary !== 'string' ||
    reasoning.length === 0
  ) {
    throw new Error('The AI returned an unexpected response.')
  }

  return {
    curveId: suggestion.curveId,
    summary: suggestion.summary,
    reasoning: reasoning.slice(0, 3),
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
