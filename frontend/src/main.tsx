import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { AuthProvider } from './lib/auth.tsx'
import { GuestOnly, Layout, RequireAuth } from './components/layout.tsx'
import { Home } from './pages/home.tsx'
import { SignUp } from './pages/sign-up.tsx'
import { SignIn } from './pages/sign-in.tsx'
import { VerifyEmail } from './pages/verify-email.tsx'
import { ForgotPassword } from './pages/forgot-password.tsx'
import { ResetPassword } from './pages/reset-password.tsx'
import { Dashboard } from './pages/dashboard.tsx'
import { NotFound } from './pages/not-found.tsx'

// these paths are fixed by the links the api puts in emails (docs/API.md, "Frontend pages the emails link to")
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      {
        element: <GuestOnly />,
        children: [
          { path: '/sign-up', element: <SignUp /> },
          { path: '/sign-in', element: <SignIn /> },
        ],
      },
      { path: '/verify-email', element: <VerifyEmail /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password', element: <ResetPassword /> },
      {
        element: <RequireAuth />,
        children: [{ path: '/dashboard', element: <Dashboard /> }],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
