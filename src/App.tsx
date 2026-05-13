import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppLayout } from './layout/AppLayout'
import { RequireAuth } from './auth/RequireAuth'
import { RequireRole } from './auth/RequireRole'
import { LazyRoute } from './components/LazyRoute'
import { LoadingState } from './components/LoadingState'

const ClientesPage = lazy(() => import('./pages/ClientesPage').then(m => ({ default: m.ClientesPage })))
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage').then(m => ({ default: m.ConfiguracoesPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const OrcamentoDetalhePage = lazy(() => import('./pages/OrcamentoDetalhePage').then(m => ({ default: m.OrcamentoDetalhePage })))
const OrcamentoNovoPage = lazy(() => import('./pages/OrcamentoNovoPage').then(m => ({ default: m.OrcamentoNovoPage })))
const OrcamentosPage = lazy(() => import('./pages/OrcamentosPage').then(m => ({ default: m.OrcamentosPage })))
const ProdutosPage = lazy(() => import('./pages/ProdutosPage').then(m => ({ default: m.ProdutosPage })))
const LoginGerentePage = lazy(() => import('./pages/LoginGerentePage').then(m => ({ default: m.LoginGerentePage })))
const LoginVendedorPage = lazy(() => import('./pages/LoginVendedorPage').then(m => ({ default: m.LoginVendedorPage })))
const RegisterGerentePage = lazy(() => import('./pages/RegisterGerentePage').then(m => ({ default: m.RegisterGerentePage })))
const VendedoresPage = lazy(() => import('./pages/VendedoresPage').then(m => ({ default: m.VendedoresPage })))
const AuthConfirmCallbackPage = lazy(() =>
  import('./pages/AuthConfirmCallbackPage').then(m => ({ default: m.AuthConfirmCallbackPage })),
)

const SuspenseFallback = <LoadingState message="Carregando página..." />

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton duration={4000} />
      <Routes>
        <Route path="/login" element={<Navigate to="/login-gerente" replace />} />
        <Route
          path="/login-gerente"
          element={
            <LazyRoute fallback={SuspenseFallback}>
              <LoginGerentePage />
            </LazyRoute>
          }
        />
        <Route
          path="/login-vendedor"
          element={
            <LazyRoute fallback={SuspenseFallback}>
              <LoginVendedorPage />
            </LazyRoute>
          }
        />
        <Route
          path="/auth/confirm-callback"
          element={
            <LazyRoute fallback={SuspenseFallback}>
              <AuthConfirmCallbackPage />
            </LazyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <LazyRoute fallback={SuspenseFallback}>
              <RegisterGerentePage />
            </LazyRoute>
          }
        />
        <Route
          element={
            <RequireAuth>
              <Suspense fallback={SuspenseFallback}>
                <AppLayout />
              </Suspense>
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route
            path="produtos"
            element={
              <RequireRole allowedRoles={['gerente', 'vendedor']}>
                <ProdutosPage />
              </RequireRole>
            }
          />
          <Route path="orcamentos" element={<OrcamentosPage />} />
          <Route path="orcamentos/novo" element={<OrcamentoNovoPage />} />
          <Route path="orcamentos/:id" element={<OrcamentoDetalhePage />} />
          <Route
            path="configuracoes"
            element={
              <RequireRole allowedRoles={['gerente', 'vendedor']}>
                <ConfiguracoesPage />
              </RequireRole>
            }
          />
          <Route
            path="vendedores"
            element={
              <RequireRole allowedRoles={['gerente']}>
                <VendedoresPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
