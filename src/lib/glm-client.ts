/**
 * AgentForge — GLM5.1 API Client
 *
 * Uses z-ai-web-dev-sdk exclusively for all GLM API calls.
 * This module provides a singleton client and a convenience function
 * for making chat completion requests.
 *
 * IMPORTANT: This must only be used on the server side (API routes, server actions).
 * Never import this in client-side components.
 */

import ZAI from 'z-ai-web-dev-sdk'

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
}

export interface GLMCallResult {
  success: boolean
  content: string | null
  error?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// ============================================================
// Main API Call Function
// ============================================================

/**
 * Calls the GLM5.1 chat completions API with the given messages.
 *
 * @param messages - Array of chat messages with role and content
 * @param options - Optional parameters like temperature and max_tokens
 * @returns GLMCallResult with success status, content, and optional error/usage info
 *
 * @example
 * ```ts
 * const result = await callGLM([
 *   { role: 'system', content: 'You are a helpful coding assistant.' },
 *   { role: 'user', content: 'Write a hello world in TypeScript.' },
 * ], { temperature: 0.7 })
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
    temperature = 0.7,
    max_tokens = 4096,
  } = options

  try {
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
      console.error('[GLM Client] No content in response:', JSON.stringify(completion))
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('[GLM Client] API call failed:', errorMessage)
    return {
      success: false,
      content: null,
      error: errorMessage,
    }
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
