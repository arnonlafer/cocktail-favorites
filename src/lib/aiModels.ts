import type { AiVendor } from '../types'

export interface AiModelOption {
  id: string
  label: string
}

export const AI_MODELS: Record<AiVendor, AiModelOption[]> = {
  openai: [
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
    { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { id: 'gpt-4.1-nano', label: 'GPT-4.1 nano' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4o', label: 'GPT-4o' },
  ],
  anthropic: [
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { id: 'claude-opus-4-5-20251101', label: 'Claude Opus 4.5' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
    { id: 'gemini-flash-latest', label: 'Gemini Flash (latest)' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
}

/** Map retired preview/alias IDs to current chat-capable models. */
const DEPRECATED_MODEL_IDS: Record<string, string> = {
  'gemini-2.5-flash-preview-05-20': 'gemini-2.5-flash',
  'gemini-2.5-flash-preview-04-17': 'gemini-2.5-flash',
  'gemini-2.5-flash-preview-09-2025': 'gemini-2.5-flash',
  'claude-3-5-haiku-20241022': 'claude-haiku-4-5-20251001',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4-6',
  'claude-sonnet-4-20250514': 'claude-sonnet-4-6',
  'claude-opus-4-20250514': 'claude-opus-4-6',
}

export const AI_VENDOR_LABELS: Record<AiVendor, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
}

export const AI_VENDOR_ORDER: AiVendor[] = ['openai', 'anthropic', 'gemini']

export function defaultModelForVendor(vendor: AiVendor): string {
  return AI_MODELS[vendor][0]?.id ?? ''
}

export function isModelValidForVendor(vendor: AiVendor, model: string): boolean {
  return AI_MODELS[vendor].some((option) => option.id === model)
}

export function resolveModelForVendor(vendor: AiVendor, model: string | undefined): string {
  const trimmed = model?.trim() ?? ''
  const remapped = DEPRECATED_MODEL_IDS[trimmed] ?? trimmed
  if (remapped && isModelValidForVendor(vendor, remapped)) return remapped
  return defaultModelForVendor(vendor)
}
