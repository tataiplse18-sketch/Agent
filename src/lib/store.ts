/**
 * AgentForge — Frontend State Management (Zustand Store)
 *
 * Manages global application state including:
 * - Project list and current project selection
 * - UI loading/creation states
 * - Real-time WebSocket updates (agent messages, task updates)
 *
 * The store is intentionally lean for the MVP — only essential state
 * that multiple components need to share.
 */

import { create } from 'zustand'

// ============================================================
// Domain Types (aligned with Prisma models)
// ============================================================

export interface Project {
  id: string
  name: string
  description: string | null
  goal: string | null
  status: string
  techStack: string | null
  createdAt: string
  updatedAt: string
  tasks?: Task[]
  agentMessages?: AgentMessage[]
  codeFiles?: CodeFile[]
  taskCount?: number
  codeFileCount?: number
  messageCount?: number
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  agentType: string
  status: string
  output: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface AgentMessage {
  id: string
  projectId: string
  agentType: string
  role: string
  content: string
  metadata: string | null
  createdAt: string
}

export interface CodeFile {
  id: string
  projectId: string
  path: string
  content: string
  language: string
  createdAt: string
  updatedAt: string
}

// ============================================================
// Live Update Types (from WebSocket events)
// ============================================================

export interface LiveAgentMessage {
  projectId: string
  agentType: string
  content: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export interface LiveTaskUpdate {
  projectId: string
  taskId: string
  status: string
  output?: string
  timestamp: string
}

export interface LiveProjectStatus {
  projectId: string
  status: string
  timestamp: string
}

// ============================================================
// App State Interface
// ============================================================

interface AppState {
  // --- Project Data ---
  projects: Project[]
  currentProject: Project | null

  // --- UI States ---
  isLoading: boolean
  isCreating: boolean
  isPipelineRunning: boolean
  error: string | null

  // --- Real-time Live Updates ---
  liveMessages: LiveAgentMessage[]
  liveTaskUpdates: Record<string, LiveTaskUpdate>
  liveProjectStatus: Record<string, LiveProjectStatus>

  // --- Project Actions ---
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  setCurrentProject: (project: Project | null) => void
  updateProjectInList: (id: string, updates: Partial<Project>) => void

  // --- UI Actions ---
  setIsLoading: (loading: boolean) => void
  setIsCreating: (creating: boolean) => void
  setIsPipelineRunning: (running: boolean) => void
  setError: (error: string | null) => void

  // --- Live Update Actions ---
  addLiveMessage: (message: LiveAgentMessage) => void
  addLiveTaskUpdate: (update: LiveTaskUpdate) => void
  addLiveProjectStatus: (update: LiveProjectStatus) => void
  clearLiveUpdates: () => void

  // --- Reset ---
  reset: () => void
}

// ============================================================
// Initial State
// ============================================================

const initialState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  isCreating: false,
  isPipelineRunning: false,
  error: null,
  liveMessages: [],
  liveTaskUpdates: {},
  liveProjectStatus: {},
}

// ============================================================
// Zustand Store
// ============================================================

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  // --- Project Actions ---

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),

  setCurrentProject: (project) => set({ currentProject: project }),

  updateProjectInList: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, ...updates }
          : state.currentProject,
    })),

  // --- UI Actions ---

  setIsLoading: (isLoading) => set({ isLoading }),
  setIsCreating: (isCreating) => set({ isCreating }),
  setIsPipelineRunning: (isPipelineRunning) => set({ isPipelineRunning }),
  setError: (error) => set({ error }),

  // --- Live Update Actions ---

  addLiveMessage: (message) =>
    set((state) => ({
      liveMessages: [...state.liveMessages, message],
    })),

  addLiveTaskUpdate: (update) =>
    set((state) => ({
      liveTaskUpdates: {
        ...state.liveTaskUpdates,
        [update.taskId]: update,
      },
      // Also update the task in currentProject if applicable
      currentProject: state.currentProject
        ? {
            ...state.currentProject,
            tasks: state.currentProject.tasks?.map((t) =>
              t.id === update.taskId
                ? { ...t, status: update.status, output: update.output ?? t.output }
                : t
            ),
          }
        : null,
    })),

  addLiveProjectStatus: (update) =>
    set((state) => ({
      liveProjectStatus: {
        ...state.liveProjectStatus,
        [update.projectId]: update,
      },
      // Also update project in list and current
      projects: state.projects.map((p) =>
        p.id === update.projectId ? { ...p, status: update.status } : p
      ),
      currentProject:
        state.currentProject?.id === update.projectId
          ? { ...state.currentProject, status: update.status }
          : state.currentProject,
      isPipelineRunning:
        update.projectId === state.currentProject?.id &&
        ['pending', 'planning', 'coding', 'testing', 'reviewing'].includes(update.status)
          ? true
          : ['completed', 'failed'].includes(update.status)
            ? false
            : state.isPipelineRunning,
    })),

  clearLiveUpdates: () =>
    set({
      liveMessages: [],
      liveTaskUpdates: {},
      liveProjectStatus: {},
    }),

  // --- Reset ---

  reset: () => set(initialState),
}))
