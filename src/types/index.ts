/**
 * AgentForge — TypeScript Type Definitions
 *
 * Central type definitions for the AgentForge platform.
 * These types align with the Prisma schema and provide
 * strict typing across the application.
 */

// ============================================================
// Status & Role Enums
// ============================================================

/** Possible statuses for a Project throughout its lifecycle */
export type ProjectStatus =
  | "pending"
  | "planning"
  | "coding"
  | "testing"
  | "reviewing"
  | "completed"
  | "failed"

/** Possible statuses for a Task during agent execution */
export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"

/** Types of agents that can be assigned to tasks */
export type AgentType =
  | "orchestrator"
  | "planner"
  | "coder"
  | "qa"
  | "git"
  | "system"

/** Roles in a conversation (aligned with LLM chat message roles) */
export type MessageRole =
  | "system"
  | "user"
  | "assistant"

// ============================================================
// Core Domain Types
// ============================================================

/** Project creation input */
export interface ProjectInput {
  name: string
  description?: string
  goal?: string
  techStack?: string[]
}

/** Task creation input */
export interface TaskInput {
  projectId: string
  title: string
  description?: string
  agentType: AgentType
  order?: number
}

/** Agent message creation input */
export interface AgentMessageInput {
  projectId: string
  agentType: AgentType
  role: MessageRole
  content: string
  metadata?: Record<string, unknown>
}

/** Code file creation input */
export interface CodeFileInput {
  projectId: string
  path: string
  content: string
  language: string
}

// ============================================================
// Relation-Enriched Types
// ============================================================

/** Task with its parent Project relation included */
export interface TaskWithProject {
  id: string
  projectId: string
  title: string
  description: string | null
  agentType: AgentType
  status: TaskStatus
  output: string | null
  order: number
  createdAt: Date
  updatedAt: Date
  project: {
    id: string
    name: string
    status: ProjectStatus
    goal: string | null
    techStack: string | null
  }
}

/** AgentMessage with its parent Project relation included */
export interface AgentMessageWithProject {
  id: string
  projectId: string
  agentType: AgentType
  role: MessageRole
  content: string
  metadata: string | null
  createdAt: Date
  project: {
    id: string
    name: string
    status: ProjectStatus
  }
}

/** CodeFile with its parent Project relation included */
export interface CodeFileWithProject {
  id: string
  projectId: string
  path: string
  content: string
  language: string
  createdAt: Date
  updatedAt: Date
  project: {
    id: string
    name: string
    status: ProjectStatus
    techStack: string | null
  }
}

// ============================================================
// Agent-Specific Types
// ============================================================

/** Configuration for an agent within the orchestration pipeline */
export interface AgentConfig {
  type: AgentType
  systemPrompt: string
  temperature: number
  maxTokens: number
}

/** Result returned by an agent after executing a task */
export interface AgentResult {
  agentType: AgentType
  taskId: string
  success: boolean
  output: string | null
  error?: string
  filesGenerated?: string[]
  filesModified?: string[]
}

/** Orchestrator plan step — represents one step in the execution plan */
export interface PlanStep {
  order: number
  agentType: AgentType
  title: string
  description: string
  dependencies: number[] // indices of steps this depends on
}

/** Full orchestrator plan for a project */
export interface OrchestratorPlan {
  projectId: string
  steps: PlanStep[]
  estimatedComplexity: "low" | "medium" | "high"
  techStack: string[]
}

// ============================================================
// API Response Types
// ============================================================

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/** Paginated API response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ============================================================
// Utility Types
// ============================================================

/** Make specific keys required in a type */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

/** Convert a type's specified keys to optional */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
