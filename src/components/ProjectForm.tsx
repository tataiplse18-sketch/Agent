'use client'

/**
 * AgentForge — Project Creation Form
 *
 * The hero component of the app. Users describe what they want
 * AI to build, and the agents handle everything from planning to deployment.
 */

import { useState } from 'react'
import { Sparkles, Loader2, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/lib/store'

export default function ProjectForm() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('')
  const [techStack, setTechStack] = useState('')

  const { isCreating, setIsCreating, addProject, setCurrentProject, setError } = useAppStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !description.trim() || !goal.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      // Step 1: Create the project
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          goal: goal.trim(),
          techStack: techStack.trim() || undefined,
        }),
      })

      const createData = await createRes.json()

      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create project')
      }

      const project = createData.project
      addProject(project)
      setCurrentProject(project)

      // Step 2: Start the agent pipeline (fire and forget)
      try {
        await fetch(`/api/projects/${project.id}/start`, {
          method: 'POST',
        })
      } catch {
        // Pipeline start failure is non-critical — project was created
        console.error('Failed to start pipeline automatically')
      }

      // Reset form
      setName('')
      setDescription('')
      setGoal('')
      setTechStack('')

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong'
      setError(message)
      console.error('[ProjectForm] Error:', message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Cpu className="h-8 w-8 text-emerald-500" />
          <h1 className="text-3xl font-bold text-white tracking-tight">AgentForge</h1>
        </div>
        <p className="text-zinc-400 text-lg">Your AI Software Engineering Team</p>
        <p className="text-zinc-500 text-sm mt-2">
          Describe what you want to build, and our AI agents will plan, code, test, and deliver.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 shadow-2xl shadow-emerald-500/5">
        <CardHeader>
          <CardTitle className="text-white text-xl">Create New Project</CardTitle>
          <CardDescription className="text-zinc-400">
            Tell our AI agents what software you need, and they&apos;ll build it for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">
                Project Name <span className="text-emerald-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="my-awesome-app"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-zinc-300 text-sm font-medium">
                Description <span className="text-emerald-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="A brief description of the project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={2}
                className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 resize-none"
              />
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <Label htmlFor="goal" className="text-zinc-300 text-sm font-medium">
                Goal <span className="text-emerald-500">*</span>
              </Label>
              <Textarea
                id="goal"
                placeholder="Describe the software you want AI to build... e.g. 'Build a task management app with user auth, task CRUD, and real-time updates'"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
                rows={4}
                className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 resize-none"
              />
            </div>

            {/* Tech Stack */}
            <div className="space-y-2">
              <Label htmlFor="techStack" className="text-zinc-300 text-sm font-medium">
                Tech Stack <span className="text-zinc-500 text-xs">(optional, auto-detected if empty)</span>
              </Label>
              <Input
                id="techStack"
                placeholder="e.g. Next.js, TypeScript, Tailwind CSS, Prisma"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isCreating || !name.trim() || !description.trim() || !goal.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating &amp; Starting Agents...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Launch AI Agents
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
