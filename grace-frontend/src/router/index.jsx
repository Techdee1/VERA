import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { RequireAuth } from '@/components/layout/RequireAuth'
import LandingPage from '@/pages/LandingPage'
import Login from '@/pages/auth/Login'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import Dashboard from '@/pages/dashboard/Dashboard'
import AlertsIndex from '@/pages/alerts/AlertsIndex'
import AlertDetail from '@/pages/alerts/AlertDetail'
import EntitiesIndex from '@/pages/entities/EntitiesIndex'
import EntityDetail from '@/pages/entities/EntityDetail'
import GraphExplorer from '@/pages/graph/GraphExplorer'
import STRIndex from '@/pages/str/STRIndex'
import STRDetail from '@/pages/str/STRDetail'
import AuditLog from '@/pages/audit/AuditLog'
import Settings from '@/pages/settings/Settings'
import NotFound from '@/pages/NotFound'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
    ],
  },
  {
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { index: true, path: '/dashboard', element: <Dashboard /> },
      { path: '/graph', element: <GraphExplorer /> },
      { path: '/alerts', element: <AlertsIndex /> },
      { path: '/alerts/:id', element: <AlertDetail /> },
      { path: '/entities', element: <EntitiesIndex /> },
      { path: '/entities/:id', element: <EntityDetail /> },
      { path: '/str', element: <STRIndex /> },
      { path: '/str/:id', element: <STRDetail /> },
      { path: '/audit', element: <AuditLog /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
  { path: '*', element: <NotFound /> },
])
