'use client'

/**
 * AgentForge — Project Card
 *
 * Compact card showing project overview for the projects grid.
 * Displays status, tech stack, task progress, and relative time.
 */

import { FolderKanban, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Project } from '@/lib/store'

// ============================================================
// Helpers
// ============================================================

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  pending:    { label: 'Pending',    variant: 'secondary', className: 'bg-zinc-700 text-zinc-300 hover:bg-zinc-700' },
  planning:   { label: 'Planning',   variant: 'secondary', className: 'bg-yellow-900/50 text-yellow-400 hover:bg-yellow-900/50' },
  coding:     { label: 'Coding',     variant: 'secondary', className: 'bg-blue-900/50 text-blue-400 hover:bg-blue-900/50' },
  testing:    { label: 'Testing',    variant: 'secondary', className: 'bg-purple-900/50 text-purple-400 hover:bg-purple-900/50' },
  reviewing:  { label: 'Reviewing',  variant: 'secondary', className: 'bg-teal-900/50 text-teal-400 hover:bg-teal-900/50' },
  completed:  { label: 'Completed',  variant: 'secondary', className: 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900/50' },
  failed:     { label: 'Failed',     variant: 'destructive', className: 'bg-red-900/50 text-red-400 hover:bg-red-900/50' },
}

// ============================================================
// Component
// ============================================================

interface ProjectCardProps {
  project: Project
  onClick: () => void
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  const config = statusConfig[project.status] || statusConfig.pending

  // Calculate task progress
  const totalTasks = project.tasks?.length || project.taskCount || 0
  const completedTasks = project.tasks?.filter((t) => t.status === 'completed').length || 0
  const progressValue = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Parse tech stack tags
  const techTags = project.techStack
    ? project.techStack.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 4)
    : []

  return (
    <Card
      className="bg-zinc-900 border-zinc-800 hover:border-emerald-500/30 hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header: Name + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderKanban className="h-5 w-5 text-emerald-500 shrink-0" />
            <h3 className="text-white font-semibold truncate">{project.name}</h3>
          </div>
          <Badge variant={config.variant} className={`shrink-0 text-xs ${config.className}`}>
            {config.label}
          </Badge>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        )}

        {/* Tech Stack Tags */}
        {techTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {techTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs border-zinc-700 text-zinc-400 bg-zinc-950"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Task Progress */}
        {totalTasks > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Progress</span>
              <span className="text-zinc-400">{completedTasks}/{totalTasks} tasks</span>
            </div>
            <Progress
              value={progressValue}
              className="h-1.5 bg-zinc-800 [&>div]:bg-emerald-500"
            />
          </div>
        )}

        {/* Footer: Time */}
        <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
          <Clock className="h-3.5 w-3.5" />
          <span>{getRelativeTime(project.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
