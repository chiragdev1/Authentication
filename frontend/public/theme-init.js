// runs before react and before first paint, so the page never flashes the wrong theme. the build inlines it (scripts/prerender.js),
// and the csp allows it by hash: any change here needs the new hash in deploy/ckauth.caddy (the build says which)
try {
  var stored = localStorage.getItem('ckauth-theme')
  var dark = stored === 'dark' || (stored !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
} catch (error) {}
