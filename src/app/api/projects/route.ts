/**
 * AgentForge — Projects API Routes
 *
 * POST /api/projects   — Create a new project
 * GET  /api/projects   — List all projects with task counts
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================
// POST — Create a New Project
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, goal, techStack } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project description is required' },
        { status: 400 }
      )
    }

    if (!goal || typeof goal !== 'string' || goal.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project goal is required' },
        { status: 400 }
      )
    }

    // Create the project in the database
    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        goal: goal.trim(),
        techStack: techStack?.trim() || null,
        status: 'pending',
      },
    })

    console.log(`✅ [API] Project created: ${project.id} — "${project.name}"`)

    return NextResponse.json(
      { success: true, project },
      { status: 201 }
    )

  } catch (error) {
    console.error('[API] Failed to create project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

// ============================================================
// GET — List All Projects
// ============================================================

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            tasks: true,
            codeFiles: true,
            agentMessages: true,
          },
        },
      },
    })

    // Transform to include task counts in a cleaner format
    const projectsWithCounts = projects.map((project) => ({
      ...project,
      taskCount: project._count.tasks,
      codeFileCount: project._count.codeFiles,
      messageCount: project._count.agentMessages,
      _count: undefined,
    }))

    return NextResponse.json(
      { success: true, projects: projectsWithCounts },
      { status: 200 }
    )

  } catch (error) {
    console.error('[API] Failed to list projects:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list projects' },
      { status: 500 }
    )
  }
}
