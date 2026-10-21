import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme.tsx'
import { Button } from '@/components/ui/button.tsx'

// one click flips day and night; until the first click it follows the os
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const next = resolvedTheme === 'dark' ? 'light' : 'dark'

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)} aria-label={`Switch to ${next === 'dark' ? 'night' : 'day'} theme`} title={next === 'dark' ? 'Night' : 'Day'}>
      <Sun className="size-[1.15rem] scale-100 rotate-0 transition-transform duration-500 dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-[1.15rem] scale-0 rotate-90 transition-transform duration-500 dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
