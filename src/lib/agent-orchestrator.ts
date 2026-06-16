/**
 * AgentForge — Agent Orchestrator
 *
 * The main brain of the platform. This class orchestrates the entire
 * multi-agent pipeline: Orchestrator → Planner → Coder → QA → Git
 *
 * Key Design Principles:
 * - Resilient: One task failure does NOT stop the pipeline
 * - Contextual: Each agent receives context from previous agents
 * - Observable: Every step is logged and saved to the database
 * - Deterministic: Coder uses lower temperature for consistent output
 */

import { db } from '@/lib/db'
import { callGLM, type GLMMessage } from '@/lib/glm-client'
import { AGENT_PROMPTS } from '@/lib/agent-prompts'
import type { AgentType, ProjectStatus } from '@/types'

// ============================================================
// Types
// ============================================================

/** Parsed output from the Orchestrator agent */
interface OrchestratorPlan {
  projectName: string
  techStack: string
  summary: string
  tasks: {
    title: string
    description: string
    agentType: string
    order: number
    dependencies: number[]
  }[]
}

/** Parsed file from the Coder agent output */
interface CoderFile {
  path: string
  content: string
  language: string
}

/** Parsed QA result from the QA agent output */
interface QAResult {
  status: 'pass' | 'fail' | 'needs_improvement'
  score: number
  issues: Array<{
    severity: string
    file: string
    description: string
    suggestion: string
  }>
  suggestions: string[]
  testCases: string[]
}

/** Parsed Git result from the Git agent output */
interface GitResult {
  branchName: string
  commitMessage: string
  prTitle: string
  prDescription: string
  deploymentNotes: string
}

// ============================================================
// AgentOrchestrator Class
// ============================================================

export class AgentOrchestrator {
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  // ============================================================
  // Main Pipeline Entry Point
  // ============================================================

  /**
   * Runs the full agent pipeline for a project:
   * 1. Load project from DB
   * 2. Call Orchestrator to break down the goal into tasks
   * 3. Execute each task sequentially with the appropriate agent
   * 4. Call Git agent for the whole project at the end
   * 5. Mark project as completed
   */
  async run(): Promise<void> {
    console.log(`\n🚀 [Orchestrator] Starting pipeline for project: ${this.projectId}`)

    // Step 1: Load project
    const project = await db.project.findUnique({
      where: { id: this.projectId },
      include: { tasks: { orderBy: { order: 'asc' } } },
    })

    if (!project) {
      console.error(`❌ [Orchestrator] Project not found: ${this.projectId}`)
      throw new Error(`Project not found: ${this.projectId}`)
    }

    if (!project.goal) {
      console.error(`❌ [Orchestrator] Project has no goal: ${this.projectId}`)
      throw new Error(`Project has no goal defined`)
    }

    console.log(`📋 [Orchestrator] Project: "${project.name}" | Goal: "${project.goal}"`)

    try {
      // Step 2: Update project status to "planning"
      await this.updateProjectStatus('planning')

      // Step 3: Call ORCHESTRATOR agent
      console.log(`\n🧠 [Orchestrator] Calling ORCHESTRATOR agent...`)
      const orchestratorResponse = await this.callAgent(
        'orchestrator',
        `Project Goal: ${project.goal}\n\nProject Name: ${project.name}\n${project.description ? `Description: ${project.description}` : ''}`,
        0.7
      )

      // Step 4: Parse orchestrator response
      const plan = this.parseAgentResponse<OrchestratorPlan>(orchestratorResponse)
      if (!plan) {
        console.warn(`⚠️ [Orchestrator] Failed to parse orchestrator response, using raw output`)
        await this.saveAgentMessage('orchestrator', 'assistant', orchestratorResponse || 'No response')
        await this.updateProjectStatus('failed')
        return
      }

      console.log(`✅ [Orchestrator] Plan received: "${plan.projectName}" with ${plan.tasks?.length || 0} tasks`)

      // Step 5: Update project with orchestrator output
      await db.project.update({
        where: { id: this.projectId },
        data: {
          name: plan.projectName || project.name,
          techStack: plan.techStack || project.techStack,
          description: plan.summary || project.description,
        },
      })

      // Save orchestrator response as agent message
      await this.saveAgentMessage('orchestrator', 'assistant', JSON.stringify(plan))

      // Step 6: Create tasks in DB from the plan
      if (plan.tasks && Array.isArray(plan.tasks)) {
        for (const task of plan.tasks) {
          await db.task.create({
            data: {
              projectId: this.projectId,
              title: task.title,
              description: task.description,
              agentType: task.agentType || 'coder',
              status: 'pending',
              order: task.order || 0,
            },
          })
        }
        console.log(`📝 [Orchestrator] Created ${plan.tasks.length} tasks in database`)
      }

      // Step 7: Execute each task in order
      const tasks = await db.task.findMany({
        where: { projectId: this.projectId },
        orderBy: { order: 'asc' },
      })

      for (const task of tasks) {
        console.log(`\n🔧 [Orchestrator] Executing task #${task.order}: "${task.title}" (Agent: ${task.agentType})`)
        await this.executeTask(task.id, task.agentType as AgentType, task.description || task.title)
      }

      // Step 8: Call GIT agent for the entire project
      console.log(`\n🔀 [Orchestrator] Calling GIT agent for project wrap-up...`)
      await this.runGitAgent()

      // Step 9: Mark project as completed
      await this.updateProjectStatus('completed')
      console.log(`\n🎉 [Orchestrator] Pipeline completed for project: ${this.projectId}`)

    } catch (error) {
      console.error(`❌ [Orchestrator] Pipeline error:`, error)
      await this.updateProjectStatus('failed')
      throw error
    }
  }

  // ============================================================
  // Task Execution
  // ============================================================

  /**
   * Executes a single task with the appropriate agent.
   * Handles errors gracefully — marks task as failed but continues pipeline.
   */
  private async executeTask(taskId: string, agentType: AgentType, taskDescription: string): Promise<void> {
    try {
      // Update task status to "running"
      await db.task.update({
        where: { id: taskId },
        data: { status: 'running' },
      })

      // Update project status based on agent type
      const projectStatusMap: Record<string, ProjectStatus> = {
        planner: 'planning',
        coder: 'coding',
        qa: 'testing',
        git: 'reviewing',
        orchestrator: 'planning',
      }
      await this.updateProjectStatus(projectStatusMap[agentType] || 'planning')

      // Build context from previous tasks
      const context = await this.buildTaskContext(taskId)

      // Determine temperature based on agent type
      const temperature = agentType === 'coder' ? 0.3 : 0.7

      // Build the user message with context
      const userMessage = context
        ? `${context}\n\n## Current Task\n${taskDescription}`
        : taskDescription

      // Save the user prompt as an agent message
      await this.saveAgentMessage(agentType, 'user', userMessage)

      // Call the agent
      const response = await this.callAgent(agentType, userMessage, temperature)

      // Process the response based on agent type
      if (agentType === 'coder') {
        await this.processCoderResponse(response)
      }

      // Save the agent response
      await this.saveAgentMessage(agentType, 'assistant', response || 'No response')

      // Save task output and mark as completed
      await db.task.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          output: response,
        },
      })

      console.log(`✅ [Orchestrator] Task completed: "${taskDescription.substring(0, 50)}..."`)

    } catch (error) {
      console.error(`❌ [Orchestrator] Task failed: ${taskId}`, error)
      // Mark task as failed but DON'T throw — continue the pipeline
      await db.task.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          output: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      })
    }
  }

  // ============================================================
  // Git Agent (Final Step)
  // ============================================================

  /**
   * Calls the Git agent after all tasks are done to generate
   * commit messages, branch names, and PR descriptions.
   */
  private async runGitAgent(): Promise<void> {
    try {
      // Gather all project info for the Git agent
      const project = await db.project.findUnique({
        where: { id: this.projectId },
        include: {
          tasks: { orderBy: { order: 'asc' } },
          codeFiles: true,
        },
      })

      if (!project) return

      const summary = [
        `Project: ${project.name}`,
        `Tech Stack: ${project.techStack || 'Not specified'}`,
        `Description: ${project.description || 'N/A'}`,
        ``,
        `## Tasks Completed:`,
        ...project.tasks.map(t => `- [${t.status.toUpperCase()}] ${t.title} (${t.agentType})`),
        ``,
        `## Files Generated:`,
        ...project.codeFiles.map(f => `- ${f.path} (${f.language})`),
      ].join('\n')

      await this.saveAgentMessage('git', 'user', summary)

      const response = await this.callAgent('git', summary, 0.7)

      if (response) {
        await this.saveAgentMessage('git', 'assistant', response)

        // Try to parse and save the git result as task output
        const gitResult = this.parseAgentResponse<GitResult>(response)
        if (gitResult) {
          // Create or update a git task with the result
          await db.task.create({
            data: {
              projectId: this.projectId,
              title: gitResult.prTitle || 'Git: Prepare commit and PR',
              description: `Branch: ${gitResult.branchName}\n\n${gitResult.commitMessage}`,
              agentType: 'git',
              status: 'completed',
              output: response,
              order: 999, // Git task is always last
            },
          })
        }
      }

      console.log(`✅ [Orchestrator] Git agent completed`)

    } catch (error) {
      console.error(`❌ [Orchestrator] Git agent failed:`, error)
      // Non-fatal — don't throw
    }
  }

  // ============================================================
  // Coder Response Processing
  // ============================================================

  /**
   * Parses the Coder agent's JSON array output and saves each file
   * to the CodeFile table in the database.
   */
  private async processCoderResponse(response: string | null): Promise<void> {
    if (!response) return

    const files = this.parseAgentResponse<CoderFile[]>(response)
    if (!Array.isArray(files)) {
      console.warn(`⚠️ [Orchestrator] Coder response is not a valid files array`)
      return
    }

    console.log(`📁 [Orchestrator] Processing ${files.length} files from coder...`)

    for (const file of files) {
      if (!file.path || !file.content) {
        console.warn(`⚠️ [Orchestrator] Skipping file with missing path/content`)
        continue
      }

      try {
        // Upsert: update if file already exists, create if new
        await db.codeFile.upsert({
          where: {
            id: `${this.projectId}_${file.path}`, // Composite-like ID
          },
          create: {
            projectId: this.projectId,
            path: file.path,
            content: file.content,
            language: file.language || this.detectLanguage(file.path),
          },
          update: {
            content: file.content,
            language: file.language || this.detectLanguage(file.path),
          },
        })

        console.log(`  📄 Saved: ${file.path}`)
      } catch (error) {
        // If upsert fails (e.g. ID conflict), try create instead
        try {
          await db.codeFile.create({
            data: {
              projectId: this.projectId,
              path: file.path,
              content: file.content,
              language: file.language || this.detectLanguage(file.path),
            },
          })
          console.log(`  📄 Created: ${file.path}`)
        } catch (createError) {
          console.error(`  ❌ Failed to save file: ${file.path}`, createError)
        }
      }
    }
  }

  // ============================================================
  // Context Building
  // ============================================================

  /**
   * Builds context from previously completed tasks so the current
   * agent understands what has already been done.
   */
  private async buildTaskContext(currentTaskId: string): Promise<string> {
    try {
      const currentTask = await db.task.findUnique({
        where: { id: currentTaskId },
      })

      if (!currentTask) return ''

      // Get all completed tasks that come before the current one
      const previousTasks = await db.task.findMany({
        where: {
          projectId: this.projectId,
          status: 'completed',
          order: { lt: currentTask.order },
        },
        orderBy: { order: 'asc' },
      })

      if (previousTasks.length === 0) return ''

      // Get project info for context
      const project = await db.project.findUnique({
        where: { id: this.projectId },
      })

      const contextLines: string[] = [
        `## Project Context`,
        `Name: ${project?.name || 'Unknown'}`,
        `Tech Stack: ${project?.techStack || 'Not specified'}`,
        `Goal: ${project?.goal || 'Not specified'}`,
        ``,
        `## Previous Work Completed:`,
      ]

      for (const task of previousTasks) {
        const outputPreview = task.output
          ? task.output.length > 500
            ? task.output.substring(0, 500) + '...[truncated]'
            : task.output
          : 'No output'

        contextLines.push(`### Task #${task.order}: ${task.title} (Agent: ${task.agentType})`)
        contextLines.push(outputPreview)
        contextLines.push('')
      }

      return contextLines.join('\n')

    } catch (error) {
      console.error(`⚠️ [Orchestrator] Failed to build context:`, error)
      return ''
    }
  }

  // ============================================================
  // Agent Communication
  // ============================================================

  /**
   * Calls a specific agent with its system prompt and a user message.
   */
  private async callAgent(
    agentType: AgentType | 'orchestrator',
    userMessage: string,
    temperature: number = 0.7
  ): Promise<string | null> {
    const systemPrompt = AGENT_PROMPTS[agentType]
    if (!systemPrompt) {
      console.error(`❌ [Orchestrator] No prompt found for agent type: ${agentType}`)
      return null
    }

    const messages: GLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    console.log(`📞 [Orchestrator] Calling ${agentType.toUpperCase()} agent (temp: ${temperature})...`)

    const result = await callGLM(messages, {
      temperature,
      max_tokens: 4096,
    })

    if (!result.success || !result.content) {
      console.error(`❌ [Orchestrator] ${agentType.toUpperCase()} agent failed: ${result.error}`)
      return null
    }

    console.log(`📥 [Orchestrator] ${agentType.toUpperCase()} response received (${result.content.length} chars)`)
    return result.content
  }

  // ============================================================
  // Response Parsing
  // ============================================================

  /**
   * Parses JSON from an agent response. Handles:
   * - Direct JSON strings
   * - JSON wrapped in markdown code blocks (```json ... ```)
   * - JSON with leading/trailing whitespace
   */
  private parseAgentResponse<T>(response: string | null): T | null {
    if (!response) return null

    // Attempt 1: Direct JSON parse
    try {
      return JSON.parse(response.trim()) as T
    } catch {
      // Continue to next method
    }

    // Attempt 2: Extract JSON from markdown code blocks
    const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim()) as T
      } catch {
        // Continue to next method
      }
    }

    // Attempt 3: Find the first '{' or '[' and try to parse from there
    const jsonStart = response.search(/[{[]/)
    if (jsonStart !== -1) {
      try {
        const jsonStr = response.substring(jsonStart)
        return JSON.parse(jsonStr) as T
      } catch {
        // Try to find the matching closing bracket
        try {
          const openChar = response[jsonStart]
          const closeChar = openChar === '{' ? '}' : ']'
          let depth = 0
          let endIdx = -1

          for (let i = jsonStart; i < response.length; i++) {
            if (response[i] === openChar) depth++
            if (response[i] === closeChar) depth--
            if (depth === 0) {
              endIdx = i
              break
            }
          }

          if (endIdx !== -1) {
            const extracted = response.substring(jsonStart, endIdx + 1)
            return JSON.parse(extracted) as T
          }
        } catch {
          // Give up
        }
      }
    }

    console.warn(`⚠️ [Orchestrator] Could not parse JSON from agent response`)
    return null
  }

  // ============================================================
  // Database Helpers
  // ============================================================

  /**
   * Updates the project status and logs the change.
   */
  private async updateProjectStatus(status: ProjectStatus): Promise<void> {
    try {
      await db.project.update({
        where: { id: this.projectId },
        data: { status },
      })
      console.log(`📊 [Orchestrator] Project status → ${status}`)
    } catch (error) {
      console.error(`❌ [Orchestrator] Failed to update project status:`, error)
    }
  }

  /**
   * Saves an agent message to the AgentMessage table.
   */
  private async saveAgentMessage(
    agentType: string,
    role: string,
    content: string
  ): Promise<void> {
    try {
      await db.agentMessage.create({
        data: {
          projectId: this.projectId,
          agentType,
          role,
          content,
        },
      })
    } catch (error) {
      console.error(`❌ [Orchestrator] Failed to save agent message:`, error)
    }
  }

  /**
   * Detects the programming language from a file path extension.
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescriptreact',
      js: 'javascript',
      jsx: 'javascript',
      css: 'css',
      scss: 'scss',
      html: 'html',
      json: 'json',
      md: 'markdown',
      prisma: 'prisma',
      sql: 'sql',
      yaml: 'yaml',
      yml: 'yaml',
      env: 'env',
      sh: 'bash',
      bash: 'bash',
      py: 'python',
    }
    return languageMap[ext] || 'text'
  }
}
