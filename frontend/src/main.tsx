import { createRoot, hydrateRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import './index.css'
import { App, routes } from './app.tsx'

const container = document.getElementById('root')!
const app = <App router={createBrowserRouter(routes)} />

// scripts/prerender.js marks the html it rendered at build time; only hydrate when that html is for this url,
// so a page served the empty shell (or `vite preview`'s fallback) renders from scratch instead
if(container.dataset.prerendered === window.location.pathname) {
  hydrateRoot(container, app)
} else {
  container.replaceChildren()
  createRoot(container).render(app)
}
