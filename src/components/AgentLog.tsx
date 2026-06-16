'use client'

/**
 * AgentForge — Agent Activity Log
 *
 * Terminal-style real-time log of agent messages.
 * Shows all agent communications with color-coded types
 * and auto-scrolls to the latest message.
 */

import { useEffect, useRef, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Cpu, Bot, Code, ShieldCheck, GitBranch, Terminal } from 'lucide-react'
import { useAppStore, type AgentMessage, type LiveAgentMessage } from '@/lib/store'

// ============================================================
// Agent Type Config
// ============================================================

const agentConfig: Record<string, { icon: React.ElementType; color: string; bgClass: string; label: string }> = {
  orchestrator: { icon: Cpu,         color: 'text-purple-400',   bgClass: 'bg-purple-900/30', label: 'Orchestrator' },
  planner:      { icon: Bot,         color: 'text-blue-400',     bgClass: 'bg-blue-900/30',   label: 'Planner' },
  coder:        { icon: Code,        color: 'text-emerald-400',  bgClass: 'bg-emerald-900/30', label: 'Coder' },
  qa:           { icon: ShieldCheck, color: 'text-orange-400',   bgClass: 'bg-orange-900/30', label: 'QA' },
  git:          { icon: GitBranch,   color: 'text-teal-400',     bgClass: 'bg-teal-900/30',   label: 'Git' },
  system:       { icon: Terminal,    color: 'text-zinc-400',     bgClass: 'bg-zinc-800/50',   label: 'System' },
}

// ============================================================
// Helpers
// ============================================================

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleTimeString()
}

function truncateContent(content: string, maxLen: number = 300): string {
  if (content.length <= maxLen) return content
  return content.substring(0, maxLen) + '...'
}

// ============================================================
// Message Item
// ============================================================

function MessageItem({ msg, isLive }: { msg: AgentMessage | LiveAgentMessage; isLive?: boolean }) {
  const agentType = 'agentType' in msg ? msg.agentType : 'system'
  const config = agentConfig[agentType] || agentConfig.system
  const Icon = config.icon
  const content = 'content' in msg ? msg.content : ''
  const role = 'role' in msg ? msg.role : 'assistant'
  const timestamp = 'createdAt' in msg ? msg.createdAt : ('timestamp' in msg ? msg.timestamp : '')
  const isUser = role === 'user'

  return (
    <div
      className={`flex gap-2.5 px-3 py-2 rounded-md transition-all duration-300 ${
        isUser
          ? 'bg-zinc-900/50'
          : config.bgClass
      } ${isLive ? 'animate-in fade-in slide-in-from-bottom-1 duration-300' : ''}`}
    >
      <div className={`mt-0.5 shrink-0 ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color} border-current/20`}>
            {config.label}
          </Badge>
          <span className="text-[10px] text-zinc-600">{isUser ? 'INPUT' : 'OUTPUT'}</span>
          {timestamp && (
            <span className="text-[10px] text-zinc-600 ml-auto">
              {getRelativeTime(timestamp)}
            </span>
          )}
        </div>
        <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
          {truncateContent(content, 500)}
        </pre>
      </div>
    </div>
  )
}

// ============================================================
// AgentLog Component
// ============================================================

interface AgentLogProps {
  projectId: string
}

export default function AgentLog({ projectId }: AgentLogProps) {
  const { currentProject, liveMessages } = useAppStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Combine DB messages with live messages
  const allMessages = useMemo(() => {
    const dbMessages: AgentMessage[] = currentProject?.agentMessages || []
    const live: LiveAgentMessage[] = liveMessages.filter((m) => m.projectId === projectId)

    // Merge: DB messages first, then live messages that aren't already in DB
    const dbIds = new Set(dbMessages.map((m) => m.id))
    const uniqueLive = live.map((lm, idx) => ({
      id: `live-${idx}-${Date.now()}`,
      projectId: lm.projectId,
      agentType: lm.agentType,
      role: (lm.metadata?.role as string) || 'assistant',
      content: lm.content,
      metadata: null,
      createdAt: lm.timestamp,
    }))

    return [...dbMessages, ...uniqueLive]
  }, [currentProject?.agentMessages, liveMessages, projectId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [allMessages.length, liveMessages.length])

  return (
    <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <Terminal className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-zinc-300">Agent Activity</span>
        {allMessages.length > 0 && (
          <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-400 ml-auto">
            {allMessages.length} messages
          </Badge>
        )}
      </div>

      <ScrollArea className="h-80">
        <div className="p-2 space-y-1">
          {allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <div className="relative">
                <Cpu className="h-8 w-8 text-zinc-600" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-sm mt-3">Waiting for agent activity...</p>
              <p className="text-xs text-zinc-600 mt-1">Messages will appear here in real-time</p>
            </div>
          ) : (
            allMessages.map((msg, idx) => (
              <MessageItem
                key={msg.id || idx}
                msg={msg}
                isLive={idx >= (currentProject?.agentMessages?.length || 0)}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
