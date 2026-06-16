'use client'

/**
 * AgentForge — Code Viewer
 *
 * VS Code-like code file browser with syntax highlighting.
 * Shows file list on left (or dropdown on mobile) and
 * highlighted code on the right.
 */

import { useState, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Download, FileCode2, Check, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore, type CodeFile } from '@/lib/store'

// ============================================================
// Language Map for Syntax Highlighter
// ============================================================

const extensionToLang: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  css: 'css',
  scss: 'scss',
  html: 'html',
  json: 'json',
  md: 'markdown',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  prisma: 'typescript',
  env: 'bash',
  sh: 'bash',
  bash: 'bash',
  py: 'python',
  gitignore: 'bash',
}

function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  return extensionToLang[ext] || 'text'
}

// ============================================================
// CodeViewer Component
// ============================================================

interface CodeViewerProps {
  projectId: string
}

export default function CodeViewer({ projectId }: CodeViewerProps) {
  const { currentProject } = useAppStore()
  const files = currentProject?.codeFiles || []
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const selectedFile = files.find((f) => f.id === selectedFileId) || files[0] || null

  const handleCopy = useCallback(async () => {
    if (!selectedFile) return
    try {
      await navigator.clipboard.writeText(selectedFile.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }, [selectedFile])

  const handleDownload = useCallback(() => {
    if (!selectedFile) return
    const blob = new Blob([selectedFile.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = selectedFile.path.split('/').pop() || 'file'
    a.click()
    URL.revokeObjectURL(url)
  }, [selectedFile])

  if (files.length === 0) {
    return (
      <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-8">
        <div className="flex flex-col items-center justify-center text-zinc-500">
          <FileCode2 className="h-10 w-10 text-zinc-700 mb-3" />
          <p className="text-sm font-medium">No code generated yet</p>
          <p className="text-xs text-zinc-600 mt-1">
            Code files will appear here as the Coder agent generates them
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <FileCode2 className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-zinc-300">Generated Code</span>
        <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-400 ml-1">
          {files.length} files
        </Badge>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* File List — sidebar on desktop, dropdown on mobile */}
        <div className="md:hidden p-2 border-b border-zinc-800">
          <Select
            value={selectedFile?.id || files[0]?.id}
            onValueChange={setSelectedFileId}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-sm">
              <SelectValue placeholder="Select file..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {files.map((file) => (
                <SelectItem key={file.id} value={file.id} className="text-zinc-300 text-sm">
                  {file.path}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden md:block w-56 border-r border-zinc-800 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-500 border-b border-zinc-800">
            <FolderOpen className="h-3.5 w-3.5" />
            <span>FILES</span>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="py-1">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-mono truncate transition-colors ${
                    selectedFile?.id === file.id
                      ? 'bg-emerald-900/20 text-emerald-400 border-l-2 border-emerald-500'
                      : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900 border-l-2 border-transparent'
                  }`}
                >
                  {file.path}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Code View */}
        <div className="flex-1 min-w-0">
          {selectedFile && (
            <>
              {/* File header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-300">{selectedFile.path}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-zinc-700 text-zinc-500">
                    {selectedFile.language}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 px-2 text-zinc-400 hover:text-emerald-400"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    className="h-7 px-2 text-zinc-400 hover:text-emerald-400"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Save</span>
                  </Button>
                </div>
              </div>

              {/* Syntax highlighted code */}
              <ScrollArea className="h-[400px]">
                <SyntaxHighlighter
                  language={getLanguage(selectedFile.path)}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: '16px',
                    background: 'transparent',
                    fontSize: '12px',
                    lineHeight: '1.6',
                  }}
                  showLineNumbers
                  lineNumberStyle={{
                    color: '#4a5568',
                    minWidth: '2.5em',
                  }}
                  wrapLines
                  wrapLongLines
                >
                  {selectedFile.content}
                </SyntaxHighlighter>
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
