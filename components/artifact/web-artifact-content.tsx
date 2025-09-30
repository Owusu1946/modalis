"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ToolInvocation } from 'ai'

import { Section, ToolArgsSection } from '@/components/section'
import { Input } from '@/components/ui/input'
import { CodeEditor } from '@/components/ui/code-editor'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { useArtifact } from '@/components/artifact/artifact-context'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Columns3,
  Copy,
  Download,
  Eye,
  FileCode,
  Folder,
  MoreHorizontal,
  Palette
} from 'lucide-react'

type WebFile = { path: string; language: 'html' | 'css' | 'js'; content: string }

type WebProject = {
  title?: string
  description?: string
  template?: 'blank' | 'landing' | 'portfolio'
  files: WebFile[]
}

export function WebArtifactContent({ tool }: { tool: ToolInvocation }) {
  const project: WebProject | undefined =
    tool.state === 'result' ? (tool.result as WebProject) : undefined

  if (!project?.files || project.files.length === 0) {
    return <div className="p-4">No web artifact</div>
  }

  const [title, setTitle] = useState(project.title || 'My Website')
  const [files, setFiles] = useState<WebFile[]>(project.files)
  const [activePath, setActivePath] = useState<string>(
    project.files.find(f => f.path.endsWith('.html'))?.path || project.files[0].path
  )
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('split')
  const [version, setVersion] = useState<number>(1)
  const { close } = useArtifact()
  const [showTree, setShowTree] = useState<boolean>(true)
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set())
  const originalContentsRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    setTitle(project.title || 'My Website')
    setFiles(project.files)
    setActivePath(
      project.files.find(f => f.path.endsWith('.html'))?.path || project.files[0].path
    )
    // initialize tabs and baselines
    setOpenTabs(prev => {
      const first =
        project.files.find(f => f.path.endsWith('.html'))?.path ||
        project.files[0]?.path || ''
      return first ? [first] : []
    })
    const base = new Map<string, string>()
    for (const f of project.files) base.set(f.path, f.content)
    originalContentsRef.current = base
    setDirtyPaths(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.toolCallId])

  const activeFile = files.find(f => f.path === activePath)!

  const srcDoc = useMemo(() => {
    const htmlFile = files.find(f => f.path.endsWith('.html'))
    let html = htmlFile?.content || '<!doctype html><title>Preview</title>'

    const cssFile = files.find(f => f.path.endsWith('.css'))
    const jsFile = files.find(f => f.path.endsWith('.js'))

    if (cssFile) {
      // Replace a common stylesheet link with inline CSS
      const replaced = html.replace(
        /<link[^>]*href=["']styles\.css["'][^>]*>/i,
        `<style>\n${cssFile.content}\n</style>`
      )
      if (replaced === html) {
        // Fallback: inject before </head>
        html = html.replace(
          /<\/head>/i,
          `<style>\n${cssFile.content}\n<\/style></head>`
        )
      } else {
        html = replaced
      }
    }
    if (jsFile) {
      // Replace a common script src with inline JS
      const replaced = html.replace(
        /<script[^>]*src=["']script\.js["'][^>]*>\s*<\/script>/i,
        `<script>\n${jsFile.content}\n</script>`
      )
      if (replaced === html) {
        // Fallback: inject before </body>
        html = html.replace(
          /<\/body>/i,
          `<script>\n${jsFile.content}\n<\/script></body>`
        )
      } else {
        html = replaced
      }
    }

    // Inject dynamic title if needed
    html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`)
    return html
  }, [files, title])

  const updateActiveFile = (newContent: string) => {
    setFiles(prev => prev.map(f => (f.path === activePath ? { ...f, content: newContent } : f)))
    const baseline = originalContentsRef.current.get(activePath) ?? ''
    setDirtyPaths(prev => {
      const next = new Set(prev)
      if (newContent !== baseline) next.add(activePath)
      else next.delete(activePath)
      return next
    })
  }

  // Tabs helpers
  const ensureTab = useCallback((path: string) => {
    setOpenTabs(prev => (prev.includes(path) ? prev : [...prev, path]))
  }, [])

  const closeTab = useCallback(
    (path: string) => {
      setOpenTabs(prev => {
        const idx = prev.indexOf(path)
        const next = prev.filter(p => p !== path)
        if (path === activePath) {
          const fallback = next[idx - 1] || next[idx] || files[0]?.path
          if (fallback) setActivePath(fallback)
        }
        return next
      })
    },
    [activePath, files]
  )

  // Save snapshot helper, used by dropdown and Ctrl+S
  const saveSnapshot = useCallback(() => {
    setVersion(v => v + 1)
    const base = new Map<string, string>()
    for (const f of files) base.set(f.path, f.content)
    originalContentsRef.current = base
    setDirtyPaths(new Set())
    toast.success('Saved snapshot')
  }, [files])

  // Global key handler for Ctrl+S / Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        saveSnapshot()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [saveSnapshot])

  // Build a simple directory tree from file paths
  type TreeNode = { name: string; path?: string; type: 'dir' | 'file'; language?: WebFile['language']; children?: TreeNode[] }
  function buildTree(paths: WebFile[]): TreeNode {
    const root: TreeNode = { name: 'root', type: 'dir', children: [] }
    for (const f of paths) {
      const parts = f.path.split('/')
      let node = root
      parts.forEach((part, idx) => {
        const isFile = idx === parts.length - 1
        if (isFile) {
          node.children!.push({ name: part, path: f.path, type: 'file', language: f.language })
        } else {
          let dir = node.children!.find(c => c.type === 'dir' && c.name === part)
          if (!dir) {
            dir = { name: part, type: 'dir', children: [] }
            node.children!.push(dir)
          }
          node = dir
        }
      })
    }
    return root
  }

  const tree = useMemo(() => buildTree(files), [files])

  const Breadcrumbs = () => {
    const parts = activePath.split('/')
    return (
      <div className="hidden md:flex items-center text-xs sm:text-sm text-muted-foreground">
        {parts.map((p, i) => (
          <div key={`${p}-${i}`} className="flex items-center">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 mx-1" />}
            <span className={i === parts.length - 1 ? 'text-foreground' : ''}>{p}</span>
          </div>
        ))}
      </div>
    )
  }

  const FileTree = ({ node, depth = 0 }: { node: TreeNode; depth?: number }) => {
    const [open, setOpen] = useState(true)
    if (node.type === 'file') {
      const isActive = node.path === activePath
      const icon = node.language === 'html' ? (
        <FileCode className="h-4 w-4" />
      ) : node.language === 'css' ? (
        <Palette className="h-4 w-4" />
      ) : (
        <Code2 className="h-4 w-4" />
      )
      return (
        <button
          type="button"
          onClick={() => {
            ensureTab(node.path!)
            setActivePath(node.path!)
          }}
          className={
            `w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left ` +
            (isActive
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground')
          }
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {icon}
          <span className="truncate">{node.name}</span>
        </button>
      )
    }
    // dir
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-muted-foreground hover:text-foreground hover:bg-accent/40"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          <Folder className="h-4 w-4" />
          <span className="font-medium truncate">{node.name}</span>
        </button>
        {open && (
          <div>
            {node.children?.map((c, idx) => (
              <FileTree key={`${c.name}-${idx}`} node={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content)
    } catch {}
  }
  const handleDownload = () => {
    const blob = new Blob([activeFile.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activeFile.path
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <ToolArgsSection tool="web">{title}</ToolArgsSection>

      {/* Top toolbar mimicking the screenshot */}
      <div className="flex items-center justify-between rounded-md border bg-background px-2 py-1.5">
        <div className="flex items-center gap-2">
          {/* Left rail/back */}
          <button
            type="button"
            onClick={close}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent/60"
            title="Close"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* View switch */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`px-2.5 py-1.5 text-xs inline-flex items-center gap-1 ${
                viewMode === 'code' ? 'bg-accent text-accent-foreground' : ''
              }`}
              title="Code"
            >
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">Code</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1.5 text-xs inline-flex items-center gap-1 border-l ${
                viewMode === 'preview' ? 'bg-accent text-accent-foreground' : ''
              }`}
              title="Preview"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1.5 text-xs inline-flex items-center gap-1 border-l ${
                viewMode === 'split' ? 'bg-accent text-accent-foreground' : ''
              }`}
              title="Split"
            >
              <Columns3 className="h-4 w-4" />
              <span className="hidden sm:inline">Split</span>
            </button>
          </div>

          {/* Breadcrumb */}
          <Separator orientation="vertical" className="mx-2 h-6" />
          <Breadcrumbs />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="px-2.5 py-1.5 inline-flex items-center gap-1 rounded-md border text-xs hover:bg-accent/60"
              >
                <span>v{version}</span>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={saveSnapshot}>
                Save snapshot (v{version + 1})
              </DropdownMenuItem>
              {version > 1 && (
                <DropdownMenuItem onClick={() => setVersion(1)}>
                  Revert to v1
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={handleCopy}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent/60"
            title="Copy file"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent/60"
            title="Download file"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Left rail */}
        <div className="hidden xl:flex xl:col-span-1">
          <div className="flex flex-col items-center gap-2 py-2 px-1 rounded-md border bg-background w-full">
            <button
              type="button"
              onClick={() => setShowTree(v => !v)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent/50"
              title={showTree ? 'Hide sidebar' : 'Show sidebar'}
            >
              {showTree ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent/50 ${
                viewMode === 'code' ? 'bg-accent text-accent-foreground' : ''
              }`}
              title="Code"
            >
              <Code2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent/50 ${
                viewMode === 'preview' ? 'bg-accent text-accent-foreground' : ''
              }`}
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent/50 ${
                viewMode === 'split' ? 'bg-accent text-accent-foreground' : ''
              }`}
              title="Split"
            >
              <Columns3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* File Tree */}
        {showTree && (
        <div className="xl:col-span-3">
          <Section title="Files" className="h-full">
            <div className="text-sm">
              {tree.children?.map((c, idx) => (
                <FileTree
                  key={`${c.name}-${idx}`}
                  node={c}
                  depth={0}
                />
              ))}
            </div>
          </Section>
        </div>
        )}

        {/* Editor */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div
            className={
              viewMode === 'split'
                ? showTree
                  ? 'xl:col-span-5'
                  : 'xl:col-span-7'
                : showTree
                  ? 'xl:col-span-8'
                  : 'xl:col-span-11'
            }
          >
          <Section title="Editor" className="h-full">
            {/* Tabs */}
            <div className="mb-2 overflow-x-auto">
              <div className="flex items-center gap-1">
                {openTabs.map(path => {
                  const isActive = path === activePath
                  const isDirty = dirtyPaths.has(path)
                  const name = path.split('/').pop() || path
                  return (
                    <button
                      key={path}
                      type="button"
                      onClick={() => setActivePath(path)}
                      className={`px-2 py-1 rounded-md border text-xs inline-flex items-center gap-1 whitespace-nowrap ${
                        isActive ? 'bg-accent text-accent-foreground' : 'bg-background hover:bg-accent/50'
                      }`}
                      title={path}
                    >
                      <span className="truncate max-w-[160px]">{name}</span>
                      {isDirty && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />}
                      <span
                        onClick={e => {
                          e.stopPropagation()
                          closeTab(path)
                        }}
                        className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded hover:bg-foreground/10"
                        aria-label="Close tab"
                      >
                        ×
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              {activeFile.language !== 'html' && (
                <div className="flex items-center gap-2">
                  <label htmlFor="project-title" className="text-xs opacity-80">
                    Title
                  </label>
                  <Input
                    id="project-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="h-8"
                  />
                </div>
              )}
              <CodeEditor
                value={activeFile.content}
                onChange={updateActiveFile}
                language={
                  activeFile.language === 'js' ? 'javascript' : (activeFile.language as 'html' | 'css' | 'javascript')
                }
                minHeight="70vh"
                className="min-h-[50vh] xl:min-h-[70vh]"
              />
            </div>
          </Section>
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={
              viewMode === 'split'
                ? showTree
                  ? 'xl:col-span-3'
                  : 'xl:col-span-4'
                : showTree
                  ? 'xl:col-span-8'
                  : 'xl:col-span-11'
            }
          >
          <Section title="Live Preview" className="h-full">
            <div className="rounded-lg overflow-hidden border border-input bg-background">
              <iframe
                title="Preview"
                className="w-full h-[50vh] xl:h-[70vh] bg-white"
                sandbox="allow-scripts allow-same-origin"
                srcDoc={srcDoc}
              />
            </div>
          </Section>
          </div>
        )}
      </div>
    </div>
  )
}
