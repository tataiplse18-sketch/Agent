/**
 * AgentForge — GLM5.1 API Client
 *
 * Uses z-ai-web-dev-sdk exclusively for all GLM API calls.
 * Features:
 * - Singleton client instance
 * - Automatic retry on failure (up to 2 retries with delay)
 * - Comprehensive error handling and logging
 * - Convenience helpers for common call patterns
 *
 * IMPORTANT: This must only be used on the server side (API routes, server actions).
 * Never import this in client-side components.
 */

import ZAI from 'z-ai-web-dev-sdk'

// ============================================================
// Configuration
// ============================================================

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 2000
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 4096

// ============================================================
// Singleton GLM Client
// ============================================================

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

/**
 * Returns a singleton ZAI client instance.
 * The client is created once and reused across all calls.
 */
export async function getGLMClient() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

// ============================================================
// Types
// ============================================================

export interface GLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GLMCallOptions {
  temperature?: number
  max_tokens?: number
  maxRetries?: number
  retryDelay?: number
}

export interface GLMCallResult {
  success: boolean
  content: string | null
  error?: string
  retryCount?: number
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// ============================================================
// Delay Helper
// ============================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================
// Single API Call (no retry)
// ============================================================

async function callGLMOnce(
  messages: GLMMessage[],
  options: GLMCallOptions
): Promise<GLMCallResult> {
  const {
    temperature = DEFAULT_TEMPERATURE,
    max_tokens = DEFAULT_MAX_TOKENS,
  } = options

  const zai = await getGLMClient()

  const completion = await zai.chat.completions.create({
    messages,
    temperature,
    max_tokens,
  })

  const content = completion.choices[0]?.message?.content ?? null
  const usage = completion.usage
    ? {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens,
      }
    : undefined

  if (!content) {
    return {
      success: false,
      content: null,
      error: 'No content returned from GLM API',
    }
  }

  return {
    success: true,
    content,
    usage,
  }
}

// ============================================================
// Main API Call Function (with retry)
// ============================================================

/**
 * Calls the GLM5.1 chat completions API with automatic retry on failure.
 *
 * @param messages - Array of chat messages with role and content
 * @param options - Optional parameters including retry configuration
 * @returns GLMCallResult with success status, content, retry count, and optional error/usage
 *
 * @example
 * ```ts
 * const result = await callGLM([
 *   { role: 'system', content: 'You are a helpful coding assistant.' },
 *   { role: 'user', content: 'Write a hello world in TypeScript.' },
 * ], { temperature: 0.7, maxRetries: 2 })
 *
 * if (result.success && result.content) {
 *   console.log(result.content)
 * }
 * ```
 */
export async function callGLM(
  messages: GLMMessage[],
  options: GLMCallOptions = {}
): Promise<GLMCallResult> {
  const {
    maxRetries = MAX_RETRIES,
    retryDelay = RETRY_DELAY_MS,
  } = options

  let lastError: string = 'Unknown error occurred'

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await callGLMOnce(messages, options)

      if (result.success) {
        return {
          ...result,
          retryCount: attempt,
        }
      }

      // Non-retryable error (no content in response)
      lastError = result.error || 'No content in response'

      // Don't retry if it's a parsing/content issue — the API call succeeded
      if (result.error?.includes('No content returned')) {
        console.warn(`[GLM Client] API returned empty content (attempt ${attempt + 1}/${maxRetries + 1})`)
        if (attempt < maxRetries) {
          console.log(`[GLM Client] Retrying in ${retryDelay}ms...`)
          await delay(retryDelay)
          continue
        }
      }

    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error(
        `[GLM Client] API call failed (attempt ${attempt + 1}/${maxRetries + 1}): ${lastError}`
      )

      if (attempt < maxRetries) {
        console.log(`[GLM Client] Retrying in ${retryDelay}ms...`)
        await delay(retryDelay)
      }
    }
  }

  // All retries exhausted
  console.error(`[GLM Client] All ${maxRetries + 1} attempts failed. Last error: ${lastError}`)
  return {
    success: false,
    content: null,
    error: `Failed after ${maxRetries + 1} attempts. Last error: ${lastError}`,
    retryCount: maxRetries,
  }
}

// ============================================================
// Convenience Helpers
// ============================================================

/**
 * Simple callGLM wrapper that returns just the content string or null.
 * Useful when you don't need the full result object.
 */
export async function callGLMSimple(
  messages: GLMMessage[],
  options?: GLMCallOptions
): Promise<string | null> {
  const result = await callGLM(messages, options)
  return result.success ? result.content : null
}

/**
 * Call GLM with a system prompt and a single user message.
 * Most common usage pattern for agent interactions.
 */
export async function callGLMWithSystem(
  systemPrompt: string,
  userMessage: string,
  options?: GLMCallOptions
): Promise<string | null> {
  return callGLMSimple(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    options
  )
}
