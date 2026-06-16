/**
 * AgentForge — Single Project API Route
 *
 * GET /api/projects/[id] — Get a project with all its relations
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
        },
        agentMessages: {
          orderBy: { createdAt: 'asc' },
        },
        codeFiles: {
          orderBy: { path: 'asc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, project },
      { status: 200 }
    )

  } catch (error) {
    console.error('[API] Failed to get project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get project' },
      { status: 500 }
    )
  }
}
