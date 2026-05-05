export type CurveId = 'campfire' | 'moonshot'

export type CurveAnalysisResult = {
  curveId: CurveId
  summary: string
  reasoning: string[]
  modelRoute: string
}

type AnalyzeCurveRequest = {
  description: string
  acknowledgedWarning: boolean
}

type AnalyzeCurveApiResponse = {
  curveId?: string
  summary?: string
  reasoning?: unknown
  modelRoute?: string
  error?: string
}

function isCurveId(value: unknown): value is CurveId {
  return value === 'campfire' || value === 'moonshot'
}

export async function analyzeCurveSuggestion({
  description,
  acknowledgedWarning,
}: AnalyzeCurveRequest): Promise<CurveAnalysisResult> {
  const response = await fetch('/api/analyze-curve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description,
      acknowledgedWarning,
    }),
  })

  const payload = (await response.json().catch(() => null)) as AnalyzeCurveApiResponse | null

  if (!response.ok) {
    throw new Error(payload?.error ?? 'The AI analysis failed.')
  }

  const reasoning = Array.isArray(payload?.reasoning)
    ? payload.reasoning.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

  if (!payload || !isCurveId(payload.curveId) || typeof payload.summary !== 'string' || reasoning.length === 0) {
    throw new Error('The AI returned an unexpected response.')
  }

  return {
    curveId: payload.curveId,
    summary: payload.summary,
    reasoning: reasoning.slice(0, 3),
    modelRoute: typeof payload.modelRoute === 'string' ? payload.modelRoute : 'openrouter/free',
  }
}
