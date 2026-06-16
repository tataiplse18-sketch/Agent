'use client'

/**
 * AgentForge — WebSocket Hook
 *
 * Manages WebSocket connection to the real-time agent update service.
 * Features:
 * - Auto-reconnection with configurable attempts and delay
 * - Re-joins project room after reconnection
 * - Proper cleanup on unmount (prevents duplicate connections)
 * - Integrates with Zustand store for live updates
 * - Connection status tracking for UI indicators
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '@/lib/store'

// ============================================================
// Types
// ============================================================

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting'

// ============================================================
// Hook
// ============================================================

export function useWebSocket(projectId: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  const {
    addLiveMessage,
    addLiveTaskUpdate,
    addLiveProjectStatus,
    setIsPipelineRunning,
    setCurrentProject,
  } = useAppStore()

  // Stable callback refs to avoid re-connecting on store changes
  const handleMessage = useCallback((data: {
    projectId: string
    agentType: string
    content: string
    metadata?: Record<string, unknown>
    timestamp: string
  }) => {
    addLiveMessage(data)
  }, [addLiveMessage])

  const handleTaskUpdate = useCallback((data: {
    projectId: string
    taskId: string
    status: string
    output?: string
    timestamp: string
  }) => {
    addLiveTaskUpdate(data)
  }, [addLiveTaskUpdate])

  const handleProjectStatus = useCallback((data: {
    projectId: string
    status: string
    timestamp: string
  }) => {
    addLiveProjectStatus(data)

    // Auto-manage pipeline running state
    if (['completed', 'failed'].includes(data.status)) {
      setIsPipelineRunning(false)
      // Refresh the project detail to get final state
      fetch(`/api/projects/${data.projectId}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.project) {
            setCurrentProject(result.project)
          }
        })
        .catch(() => {
          // Non-critical — polling will catch up
        })
    }
  }, [addLiveProjectStatus, setIsPipelineRunning, setCurrentProject])

  useEffect(() => {
    if (!projectId) return

    // Connect to WS service via gateway proxy
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    })

    socketRef.current = socket

    // ---- Connection Events ----

    socket.on('connect', () => {
      console.log('[WS] Connected:', socket.id)
      setStatus('connected')
      // Join the project room (also re-joins after reconnection)
      socket.emit('project:join', { projectId })
    })

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason)
      setStatus('disconnected')
    })

    socket.on('reconnecting', (attempt) => {
      console.log(`[WS] Reconnecting... attempt ${attempt}`)
      setStatus('reconnecting')
    })

    socket.on('reconnect', (attempt) => {
      console.log(`[WS] Reconnected after ${attempt} attempts`)
      setStatus('connected')
    })

    socket.on('reconnect_failed', () => {
      console.error('[WS] Reconnection failed after all attempts')
      setStatus('disconnected')
    })

    // ---- Application Events ----

    socket.on('agent:message', handleMessage)
    socket.on('task:update', handleTaskUpdate)
    socket.on('project:status', handleProjectStatus)

    // ---- Cleanup ----

    return () => {
      socket.emit('project:leave', { projectId })
      socket.off('agent:message', handleMessage)
      socket.off('task:update', handleTaskUpdate)
      socket.off('project:status', handleProjectStatus)
      socket.disconnect()
      socketRef.current = null
      setStatus('disconnected')
    }
  }, [projectId, handleMessage, handleTaskUpdate, handleProjectStatus])

  return { status }
}
