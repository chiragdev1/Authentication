import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme.tsx'
import { Button } from '@/components/ui/button.tsx'

// one click flips day and night; until the first click it follows the os.
// the label is the same in both themes: the home page is prerendered without knowing the visitor's theme,
// and react doesn't correct attributes that differ when it hydrates. the icons switch with css (dark:)
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} aria-label="Switch between day and night themes" title="Day / night">
      <Sun className="size-[1.15rem] scale-100 rotate-0 transition-transform duration-500 dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-[1.15rem] scale-0 rotate-90 transition-transform duration-500 dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
