import { renderToString } from 'react-dom/server'
import { createMemoryRouter } from 'react-router'
import { App, routes } from './app.tsx'

// build-time only (scripts/prerender.js): the same tree as main.tsx, rendered in node for one url.
// nothing here runs effects, so auth stays "loading" and the theme stays "system", the same first render the browser makes
export function render(url: string) {
  return renderToString(<App router={createMemoryRouter(routes, { initialEntries: [url] })} />)
}
