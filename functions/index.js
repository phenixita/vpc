import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'

const openRouterKey = defineSecret('OPENROUTER_KEY')
const MODEL_ROUTE = 'openrouter/free'
const MAX_PROJECT_BRIEF_LENGTH = 2000

export const analyzeCurve = onRequest(
  {
    secrets: [openRouterKey],
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.set('Allow', 'POST')
      return response.status(405).json({ error: 'Method not allowed.' })
    }

    const requestBody = parseRequestBody(request.body)
    const { description, acknowledgedWarning } = requestBody ?? {}
    const apiKey = openRouterKey.value()?.trim()

    if (!apiKey) {
      return response.status(503).json({
        error: 'AI is not configured yet. Add OPENROUTER_KEY in Firebase before using this feature.',
      })
    }

    if (acknowledgedWarning !== true) {
      return response.status(400).json({
        error: 'You must confirm that you removed sensitive information before using AI analysis.',
      })
    }

    if (typeof description !== 'string' || description.trim().length < 30) {
      return response.status(400).json({
        error: 'Please provide a project brief with at least 30 characters.',
      })
    }

    if (description.length > MAX_PROJECT_BRIEF_LENGTH) {
      return response.status(400).json({
        error: `Please keep the project brief under ${MAX_PROJECT_BRIEF_LENGTH} characters.`,
      })
    }

    try {
      const upstreamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': getRequestOrigin(request.headers),
          'X-Title': 'Value Pricing Calculator',
        },
        body: JSON.stringify({
          model: MODEL_ROUTE,
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

      const payload = await upstreamResponse.json().catch(() => null)

      if (!upstreamResponse.ok) {
        return response.status(upstreamResponse.status).json({
          error: extractOpenRouterError(payload),
        })
      }

      const content = payload?.choices?.[0]?.message?.content

      if (typeof content !== 'string' || content.trim().length === 0) {
        return response.status(502).json({
          error: 'OpenRouter returned an empty response.',
        })
      }

      const parsedAnalysis = parseAnalysisContent(content)

      if (!parsedAnalysis) {
        return response.status(502).json({
          error: 'OpenRouter returned an unexpected response format.',
        })
      }

      return response.json({
        ...parsedAnalysis,
        modelRoute: MODEL_ROUTE,
      })
    } catch (error) {
      return response.status(502).json({
        error: error instanceof Error ? error.message : 'Unexpected server error.',
      })
    }
  },
)

function parseRequestBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return null
    }
  }

  return body ?? null
}

function getRequestOrigin(headers) {
  if (typeof headers.origin === 'string' && headers.origin.trim().length > 0) {
    return headers.origin
  }

  const forwardedHost = headers['x-forwarded-host']
  const host =
    typeof forwardedHost === 'string' && forwardedHost.trim().length > 0
      ? forwardedHost
      : typeof headers.host === 'string' && headers.host.trim().length > 0
        ? headers.host
        : 'localhost'

  const forwardedProto = headers['x-forwarded-proto']
  const protocol =
    typeof forwardedProto === 'string' && forwardedProto.trim().length > 0
      ? forwardedProto
      : host.startsWith('localhost')
        ? 'http'
        : 'https'

  return `${protocol}://${host}`
}

function extractOpenRouterError(payload) {
  if (typeof payload?.error === 'string' && payload.error.trim().length > 0) {
    return payload.error
  }

  if (typeof payload?.error?.message === 'string' && payload.error.message.trim().length > 0) {
    return payload.error.message
  }

  return 'OpenRouter returned an error.'
}

function normalizeCurveId(value) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.toLowerCase().replace(/[^a-z]/g, '')

  if (normalized === 'campfire') {
    return 'campfire'
  }

  if (normalized === 'moonshot') {
    return 'moonshot'
  }

  return null
}

function parseAnalysisContent(content) {
  const firstBraceIndex = content.indexOf('{')
  const lastBraceIndex = content.lastIndexOf('}')

  if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex <= firstBraceIndex) {
    return null
  }

  try {
    const parsed = JSON.parse(content.slice(firstBraceIndex, lastBraceIndex + 1))
    const curveId = normalizeCurveId(parsed?.curveId ?? parsed?.curve)
    const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : ''
    const reasoning = Array.isArray(parsed?.reasoning)
      ? parsed.reasoning
          .filter((item) => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 3)
      : []

    if (!curveId || !summary || reasoning.length === 0) {
      return null
    }

    return {
      curveId,
      summary,
      reasoning,
    }
  } catch {
    return null
  }
}
