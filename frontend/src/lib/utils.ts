import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// merges conditional classes and lets later tailwind utilities override earlier ones
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
