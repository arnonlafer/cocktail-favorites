import type { AiMessage, AiSettings } from '../types'

function parseErrorResponse(body: string, fallback: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string }
    return parsed.error?.message ?? parsed.message ?? fallback
  } catch {
    return body.trim() || fallback
  }
}

async function chatOpenAI(settings: AiSettings, messages: AiMessage[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
    }),
  })

  if (!res.ok) {
    throw new Error(parseErrorResponse(await res.text(), 'OpenAI request failed'))
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('OpenAI returned an empty response')
  return content
}

async function chatAnthropic(settings: AiSettings, messages: AiMessage[]): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 4096,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
    }),
  })

  if (!res.ok) {
    throw new Error(parseErrorResponse(await res.text(), 'Anthropic request failed'))
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  const content = data.content?.find((block) => block.type === 'text')?.text?.trim()
  if (!content) throw new Error('Anthropic returned an empty response')
  return content
}

async function chatGemini(settings: AiSettings, messages: AiMessage[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
    }),
  })

  if (!res.ok) {
    throw new Error(parseErrorResponse(await res.text(), 'Gemini request failed'))
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!content) throw new Error('Gemini returned an empty response')
  return content
}

export async function sendAiChatMessage(settings: AiSettings, messages: AiMessage[]): Promise<string> {
  if (!settings.apiKey.trim()) {
    throw new Error('Add your API key in Settings before chatting.')
  }
  if (!settings.model.trim()) {
    throw new Error('Choose a model in Settings before chatting.')
  }

  switch (settings.vendor) {
    case 'openai':
      return chatOpenAI(settings, messages)
    case 'anthropic':
      return chatAnthropic(settings, messages)
    case 'gemini':
      return chatGemini(settings, messages)
    default:
      throw new Error('Unsupported AI vendor')
  }
}
