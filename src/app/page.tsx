'use client'

/**
 * AgentForge — Main Dashboard Page
 *
 * Single-page application with 3 state-driven views:
 * VIEW 1: No projects → Hero + ProjectForm
 * VIEW 2: Projects exist → Project grid
 * VIEW 3: Project selected → Detail view (tasks, agent log, code)
 *
 * Features:
 * - WebSocket real-time updates via useWebSocket hook (auto-reconnect)
 * - Polling fallback: auto-refresh project data every 5s during pipeline
 * - Dark theme with emerald-500 accent
 * - Fully responsive
 */

import { useEffect, useCallback, useRef } from 'react'
import { Cpu, ArrowLeft, Plus, Sparkles, Loader2, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useWebSocket, type ConnectionStatus } from '@/lib/useWebSocket'
import ProjectForm from '@/components/ProjectForm'
import ProjectCard from '@/components/ProjectCard'
import TaskList from '@/components/TaskList'
import AgentLog from '@/components/AgentLog'
import CodeViewer from '@/components/CodeViewer'

// ============================================================
// Status Badge Config
// ============================================================

const statusBadge: Record<string, { label: string; className: string }> = {
  pending:    { label: 'Pending',    className: 'bg-zinc-700 text-zinc-300' },
  planning:   { label: 'Planning',   className: 'bg-yellow-900/50 text-yellow-400' },
  coding:     { label: 'Coding',     className: 'bg-blue-900/50 text-blue-400' },
  testing:    { label: 'Testing',    className: 'bg-purple-900/50 text-purple-400' },
  reviewing:  { label: 'Reviewing',  className: 'bg-teal-900/50 text-teal-400' },
  completed:  { label: 'Completed',  className: 'bg-emerald-900/50 text-emerald-400' },
  failed:     { label: 'Failed',     className: 'bg-red-900/50 text-red-400' },
}

// ============================================================
// Connection Status Indicator
// ============================================================

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') return null

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {status === 'reconnecting' ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />
          <span className="text-yellow-500">Reconnecting...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-zinc-500">Offline</span>
        </>
      )}
    </div>
  )
}

// ============================================================
// Page Component
// ============================================================

export default function Home() {
  const {
    projects,
    currentProject,
    isLoading,
    isPipelineRunning,
    setProjects,
    setCurrentProject,
    setIsLoading,
    setIsPipelineRunning,
    clearLiveUpdates,
  } = useAppStore()

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // WebSocket connection via custom hook
  const { status: wsStatus } = useWebSocket(currentProject?.id || null)

  // ============================================================
  // Load Projects on Mount
  // ============================================================

  const loadProjects = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      if (data.success) {
        setProjects(data.projects)
      }
    } catch (err) {
      console.error('[Dashboard] Failed to load projects:', err)
    } finally {
      setIsLoading(false)
    }
  }, [setProjects, setIsLoading])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // ============================================================
  // Load Current Project Detail
  // ============================================================

  const loadProjectDetail = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      const data = await res.json()
      if (data.success) {
        setCurrentProject(data.project)
      }
    } catch (err) {
      console.error('[Dashboard] Failed to load project detail:', err)
    }
  }, [setCurrentProject])

  // Load detail when currentProject.id changes
  useEffect(() => {
    if (currentProject?.id) {
      loadProjectDetail(currentProject.id)
    }
  }, [currentProject?.id, loadProjectDetail])

  // ============================================================
  // Polling Fallback — Auto-Refresh During Pipeline
  // ============================================================

  useEffect(() => {
    // Poll when pipeline is running OR when WebSocket is disconnected
    const shouldPoll =
      (isPipelineRunning && currentProject?.id) ||
      (wsStatus === 'disconnected' && currentProject?.id &&
       currentProject.status !== 'completed' && currentProject.status !== 'failed' &&
       currentProject.status !== 'pending')

    if (shouldPoll) {
      refreshIntervalRef.current = setInterval(() => {
        if (currentProject?.id) {
          loadProjectDetail(currentProject.id)
        }
      }, 5000)
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [isPipelineRunning, currentProject?.id, currentProject?.status, wsStatus, loadProjectDetail])

  // ============================================================
  // Navigation Handlers
  // ============================================================

  const handleSelectProject = (project: typeof projects[0]) => {
    setCurrentProject(project)
    // If project is in an active state, mark pipeline as running
    if (['planning', 'coding', 'testing', 'reviewing'].includes(project.status)) {
      setIsPipelineRunning(true)
    }
    clearLiveUpdates()
  }

  const handleBack = () => {
    setCurrentProject(null)
    clearLiveUpdates()
    setIsPipelineRunning(false)
    loadProjects()
  }

  const handleNewProject = () => {
    setCurrentProject(null)
    clearLiveUpdates()
  }

  // ============================================================
  // Determine Current View
  // ============================================================

  const isDetailView = !!currentProject
  const hasProjects = projects.length > 0
  const projectStatus = currentProject
    ? statusBadge[currentProject.status] || statusBadge.pending
    : null

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* ========== Sticky Header ========== */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDetailView ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-zinc-400 hover:text-white mr-1"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : null}
            <Cpu className="h-5 w-5 text-emerald-500" />
            <span className="font-bold text-lg tracking-tight">AgentForge</span>
            {isDetailView && currentProject && projectStatus && (
              <>
                <span className="text-zinc-600 mx-2">/</span>
                <span className="text-sm text-zinc-300 truncate max-w-[200px]">
                  {currentProject.name}
                </span>
                <Badge variant="secondary" className={`text-[10px] ml-2 ${projectStatus.className}`}>
                  {projectStatus.label}
                </Badge>
                {isPipelineRunning && (
                  <Loader2 className="h-4 w-4 text-emerald-500 animate-spin ml-2" />
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status Indicator */}
            {isDetailView && <ConnectionIndicator status={wsStatus} />}

            {/* WS Connected indicator */}
            {isDetailView && wsStatus === 'connected' && (
              <div className="flex items-center gap-1 text-xs text-emerald-500">
                <Wifi className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Live</span>
              </div>
            )}

            {!isDetailView && hasProjects && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewProject}
                className="border-zinc-700 text-zinc-300 hover:text-white hover:border-emerald-500/50"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Project
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ========== Main Content ========== */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {/* VIEW 3: Project Detail */}
          {isDetailView && currentProject ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
            >
              {/* Project Goal */}
              {currentProject.goal && (
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-zinc-300">Project Goal</span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">{currentProject.goal}</p>
                  {currentProject.techStack && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {currentProject.techStack.split(',').map((tech) => (
                        <Badge key={tech} variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
                          {tech.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Two-column: Tasks + Agent Log */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TaskList projectId={currentProject.id} />
                <AgentLog projectId={currentProject.id} />
              </div>

              {/* Code Viewer — full width */}
              <CodeViewer projectId={currentProject.id} />
            </motion.div>
          ) : hasProjects ? (
            /* VIEW 2: Projects Grid */
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Your Projects</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Select a project to view its agent pipeline and generated code.
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => handleSelectProject(project)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            /* VIEW 1: No Projects — Hero */
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-12"
            >
              <ProjectForm />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ========== Footer ========== */}
      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-xs text-zinc-600">
            Powered by GLM5.1 &middot; Open Source &amp; Free
          </p>
        </div>
      </footer>
    </div>
  )
}
