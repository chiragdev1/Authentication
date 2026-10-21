import { AuthPage, TextLink } from '../components/ui.tsx'

export function NotFound() {
  return (
    <AuthPage title="Page not found" subtitle="The page you're looking for doesn't exist.">
      <TextLink to="/">Back to home</TextLink>
    </AuthPage>
  )
}
