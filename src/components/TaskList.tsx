'use client'

/**
 * AgentForge — Task Pipeline Timeline
 *
 * Vertical timeline showing all tasks in the agent pipeline.
 * Each task displays its status, agent type, and collapsible output.
 * Real-time updates via WebSocket task:update events.
 */

import { useState } from 'react'
import {
  CheckCircle2,
  Circle,
  XCircle,
  Loader2,
  ChevronDown,
  Cpu,
  Bot,
  Code,
  ShieldCheck,
  GitBranch,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore, type Task } from '@/lib/store'

// ============================================================
// Agent Config
// ============================================================

const agentConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  orchestrator: { icon: Cpu,         color: 'text-purple-400',   label: 'Orchestrator' },
  planner:      { icon: Bot,         color: 'text-blue-400',     label: 'Planner' },
  coder:        { icon: Code,        color: 'text-emerald-400',  label: 'Coder' },
  qa:           { icon: ShieldCheck, color: 'text-orange-400',   label: 'QA' },
  git:          { icon: GitBranch,   color: 'text-teal-400',     label: 'Git' },
}

// ============================================================
// Status Icon
// ============================================================

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    case 'running':
      return <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />
    default:
      return <Circle className="h-5 w-5 text-zinc-600" />
  }
}

// ============================================================
// Task Item
// ============================================================

function TaskItem({ task, isLast }: { task: Task; isLast: boolean }) {
  const [isOpen, setIsOpen] = useState(task.status === 'running')
  const config = agentConfig[task.agentType] || agentConfig.coder
  const Icon = config.icon

  const hasOutput = task.output && task.output.length > 0

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[9px] top-5 bottom-0 w-0.5 bg-zinc-700" />
      )}

      {/* Status circle */}
      <div className="relative z-10 mt-0.5 shrink-0">
        <StatusIcon status={task.status} />
      </div>

      {/* Task content */}
      <div className={`flex-1 min-w-0 pb-4 ${task.status === 'running' ? 'border-l-2 border-emerald-500 pl-4' : 'pl-4'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-zinc-500 text-xs font-mono">#{task.order}</span>
          <h4 className="text-sm font-medium text-white truncate">{task.title}</h4>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color} border-current/20`}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
          <Badge
            variant="secondary"
            className={`text-[10px] ${
              task.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' :
              task.status === 'running' ? 'bg-blue-900/30 text-blue-400 animate-pulse' :
              task.status === 'failed' ? 'bg-red-900/30 text-red-400' :
              'bg-zinc-800 text-zinc-400'
            }`}
          >
            {task.status}
          </Badge>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{task.description}</p>
        )}

        {/* Collapsible Output */}
        {hasOutput && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors">
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                {isOpen ? 'Hide output' : 'Show output'}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <pre className="text-xs font-mono text-zinc-400 bg-zinc-950 rounded-md p-3 max-h-48 overflow-auto whitespace-pre-wrap break-words border border-zinc-800">
                {task.output && task.output.length > 1000
                  ? task.output.substring(0, 1000) + '\n...[truncated]'
                  : task.output}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  )
}

// ============================================================
// TaskList Component
// ============================================================

interface TaskListProps {
  projectId: string
}

export default function TaskList({ projectId }: TaskListProps) {
  const { currentProject, liveTaskUpdates } = useAppStore()

  // Merge DB tasks with live updates
  const tasks = (currentProject?.tasks || []).map((task) => {
    const liveUpdate = liveTaskUpdates[task.id]
    if (liveUpdate) {
      return { ...task, status: liveUpdate.status, output: liveUpdate.output || task.output }
    }
    return task
  })

  return (
    <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <Cpu className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-zinc-300">Pipeline Tasks</span>
        {tasks.length > 0 && (
          <span className="text-xs text-zinc-500 ml-auto">
            {tasks.filter((t) => t.status === 'completed').length}/{tasks.length} done
          </span>
        )}
      </div>

      <ScrollArea className="h-80">
        <div className="p-4">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-600 mb-2" />
              <p className="text-sm">Waiting for orchestrator to create tasks...</p>
            </div>
          ) : (
            <div>
              {tasks
                .sort((a, b) => a.order - b.order)
                .map((task, idx) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isLast={idx === tasks.length - 1}
                  />
                ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
