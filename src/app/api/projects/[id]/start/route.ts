/**
 * AgentForge — Start Pipeline API Route
 *
 * POST /api/projects/[id]/start — Start the agent orchestration pipeline
 *
 * IMPORTANT: This starts the pipeline in the BACKGROUND.
 * The HTTP response returns immediately so the frontend doesn't wait
 * for the potentially minutes-long pipeline to complete.
 * Real-time updates are sent via WebSocket.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AgentOrchestrator } from '@/lib/agent-orchestrator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Step 1: Get the project
    const project = await db.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Step 2: Check if project can be started
    const restartableStatuses = ['pending', 'failed']
    if (!restartableStatuses.includes(project.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Project is already in "${project.status}" status. Only pending or failed projects can be started.`,
        },
        { status: 400 }
      )
    }

    // Step 3: Create orchestrator and start pipeline IN BACKGROUND
    const orchestrator = new AgentOrchestrator(id)

    // Do NOT await — run in background and return immediately
    orchestrator.run().catch((err) => {
      console.error(`❌ [API] Pipeline error for project ${id}:`, err)
    })

    console.log(`🚀 [API] Pipeline started in background for project: ${id}`)

    return NextResponse.json(
      {
        success: true,
        message: 'Pipeline started. Connect to WebSocket for real-time updates.',
        projectId: id,
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('[API] Failed to start pipeline:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start pipeline' },
      { status: 500 }
    )
  }
}
