import { useEffect } from 'react'

// the <title> from index.html, kept as the home page's title; read once, before any page changes it
const baseTitle = typeof document === 'undefined' ? '' : document.title

// sets the tab title for a page, or restores the home title when called without one.
// a hook rather than react 19's <title> element: index.html already has a <title>, browsers use the first one,
// and on the prerendered home page a hoisted <title> would land inside #root
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · CKAuth` : baseTitle
  }, [title])
}
