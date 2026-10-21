import { useEffect, useState } from 'react'
import { FlaskConical, Moon, Sun, X } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { LAB_ENABLED, looks, useLook } from '@/lib/design-lab.tsx'
import { useTheme } from '@/lib/theme.tsx'

// floating switcher for comparing looks; deliberately plain zinc, so it reads the same on every candidate
export function DesignLabPanel() {
  const { look, setLook } = useLook()
  const { resolvedTheme, setTheme } = useTheme()
  const [open, setOpen] = useState(true)
  const active = LAB_ENABLED && looks.length > 1

  // alt+1…9 picks a look, alt+t flips day and night, so screens can be compared without moving the mouse
  useEffect(() => {
    if(!active) return
    function onKey(event: KeyboardEvent) {
      if(!event.altKey) return
      const target = looks[Number(event.key) - 1]
      if(target) {
        event.preventDefault()
        setLook(target.id)
      } else if(event.key.toLowerCase() === 't') {
        event.preventDefault()
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, setLook, setTheme, resolvedTheme])

  // nothing to compare yet, so stay out of the way
  if(!active) return null

  if(!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[100] flex size-11 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg ring-1 ring-white/10"
        aria-label="Open design lab"
      >
        <FlaskConical className="size-5" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-[100] w-72 rounded-xl bg-zinc-900/95 p-3 font-sans text-zinc-100 shadow-2xl ring-1 ring-white/10 backdrop-blur">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
          <FlaskConical className="size-3.5" />Design lab · dev only
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
            aria-label="Toggle day and night"
            title="Toggle day / night (Alt+T)"
          >
            {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button onClick={() => setOpen(false)} className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Minimise design lab">
            <X className="size-4" />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {looks.map((option, index) => (
          <button
            key={option.id}
            onClick={() => setLook(option.id)}
            aria-pressed={look === option.id}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
              look === option.id ? 'bg-white/12 ring-1 ring-white/20' : 'hover:bg-white/6',
            )}
          >
            <span className="flex shrink-0 -space-x-1.5">
              {option.swatch.map(color => (
                <span key={color} className="size-4 rounded-full ring-2 ring-zinc-900" style={{ background: color }} />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{String.fromCharCode(65 + index)} · {option.name}</span>
              <span className="block truncate text-xs text-zinc-400">{option.blurb}</span>
            </span>
            {index < 9 && <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">Alt {index + 1}</kbd>}
          </button>
        ))}
      </div>
    </div>
  )
}
