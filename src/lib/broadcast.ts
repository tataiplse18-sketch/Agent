/**
 * AgentForge — WebSocket Broadcast Helper
 *
 * Centralized helper for broadcasting real-time events from the
 * server-side orchestrator to the WebSocket service.
 *
 * Design decisions:
 * - Fires-and-forgets: never blocks or crashes the pipeline
 * - Uses HTTP POST to the WS mini-service (decoupled from socket.io)
 * - Truncates large payloads to avoid HTTP body size issues
 * - Configurable WS service URL via environment variable
 */

// ============================================================
// Configuration
// ============================================================

const WS_SERVICE_URL = process.env.WS_SERVICE_URL || 'http://localhost:3003'
const WS_BROADCAST_ENDPOINT = `${WS_SERVICE_URL}/broadcast`

// ============================================================
// Types
// ============================================================

export type BroadcastEventType = 'agent:message' | 'task:update' | 'project:status'

export interface BroadcastEvent {
  projectId: string
  type: BroadcastEventType
  data: Record<string, unknown>
}

// ============================================================
// Content Truncation
// ============================================================

const MAX_CONTENT_LENGTH = 2000

/**
 * Truncates string values in a data object to prevent oversized payloads.
 */
function truncateData(data: Record<string, unknown>): Record<string, unknown> {
  const truncated: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && value.length > MAX_CONTENT_LENGTH) {
      truncated[key] = value.substring(0, MAX_CONTENT_LENGTH) + '...[truncated]'
    } else {
      truncated[key] = value
    }
  }

  return truncated
}

// ============================================================
// Main Broadcast Function
// ============================================================

/**
 * Broadcasts a real-time event to the WebSocket service.
 *
 * The orchestrator runs server-side and communicates with the WS
 * mini-service via HTTP. The WS service then fans out the event
 * to all subscribed WebSocket clients.
 *
 * This function NEVER throws — if the WS service is down, it logs
 * a warning and continues. The pipeline must work without real-time
 * updates; they are a nice-to-have, not a requirement.
 *
 * @param event - The event to broadcast (type, projectId, data)
 */
export async function broadcastEvent(event: BroadcastEvent): Promise<void> {
  try {
    const payload = {
      event: event.type,
      data: truncateData({
        ...event.data,
        projectId: event.projectId,
      }),
    }

    const response = await fetch(WS_BROADCAST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000), // 3s timeout — don't hang
    })

    if (!response.ok) {
      console.warn(
        `[Broadcast] WS service returned ${response.status} for event "${event.type}" in project ${event.projectId}`
      )
    }
  } catch (error) {
    // WebSocket service may not be running — that's OK, don't crash the pipeline
    // This is a non-critical feature; the pipeline works without real-time updates
    console.warn(
      `[Broadcast] Failed to send "${event.type}" event (non-critical):`,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

// ============================================================
// Convenience Helpers
// ============================================================

/**
 * Broadcast an agent message event.
 */
export function broadcastAgentMessage(
  projectId: string,
  agentType: string,
  content: string,
  role: string = 'assistant'
): void {
  broadcastEvent({
    projectId,
    type: 'agent:message',
    data: { agentType, content, metadata: { role } },
  })
}

/**
 * Broadcast a task status update event.
 */
export function broadcastTaskUpdate(
  projectId: string,
  taskId: string,
  status: string,
  output?: string
): void {
  broadcastEvent({
    projectId,
    type: 'task:update',
    data: { taskId, status, output: output || undefined },
  })
}

/**
 * Broadcast a project status update event.
 */
export function broadcastProjectStatus(
  projectId: string,
  status: string
): void {
  broadcastEvent({
    projectId,
    type: 'project:status',
    data: { status },
  })
}
