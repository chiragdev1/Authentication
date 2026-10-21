// runs before react, as a file because the csp blocks inline scripts; sets the theme class so the page never flashes the wrong theme
try {
  var stored = localStorage.getItem('ckauth-theme')
  var dark = stored === 'dark' || (stored !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
} catch (error) {}
