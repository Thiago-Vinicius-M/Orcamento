<<<<<<< HEAD
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { Dashboard } from "@/pages/Dashboard"
import { ClientesPage } from "@/pages/clientes/ClientesPage"
import { ProdutosPage } from "@/pages/produtos/ProdutosPage"
import { OrcamentosListPage } from "@/pages/orcamentos/OrcamentosListPage"
import { OrcamentoFormPage } from "@/pages/orcamentos/OrcamentoFormPage"
import { OrcamentoViewPage } from "@/pages/orcamentos/OrcamentoViewPage"
import { ConfiguracoesPage } from "@/pages/configuracoes/ConfiguracoesPage"
import { Toaster } from "@/components/ui/sonner"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { RequireGuest } from "@/components/auth/RequireGuest"
import { LoginPage } from "@/pages/auth/LoginPage"
import { CadastroPage } from "@/pages/auth/CadastroPage"
import { DefinirSenhaPage } from "@/pages/auth/DefinirSenhaPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <RequireGuest>
              <LoginPage />
            </RequireGuest>
          }
        />
        <Route
          path="/cadastro"
          element={
            <RequireGuest>
              <CadastroPage />
            </RequireGuest>
          }
        />
        <Route
          path="/auth/definir-senha"
          element={
            <RequireGuest>
              <DefinirSenhaPage />
            </RequireGuest>
          }
        />

        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/produtos" element={<ProdutosPage />} />
          <Route path="/orcamentos" element={<OrcamentosListPage />} />
          <Route path="/orcamentos/novo" element={<OrcamentoFormPage />} />
          <Route path="/orcamentos/:id" element={<OrcamentoViewPage />} />
          <Route path="/orcamentos/:id/editar" element={<OrcamentoFormPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        </Route>
      </Routes>
      <Toaster richColors position="bottom-right" />
    </BrowserRouter>
  )
}

export default App
=======
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppLayout } from './layout/AppLayout'
import { RequireAuth } from './auth/RequireAuth'
import { RequireRole } from './auth/RequireRole'
import { ErrorBoundary } from './components/ErrorBoundary'
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

const SuspenseFallback = <LoadingState message="Carregando página..." />

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton duration={4000} />
      <Routes>
        <Route path="/login" element={<Navigate to="/login-gerente" replace />} />
        <Route path="/login-gerente" element={<ErrorBoundary><Suspense fallback={SuspenseFallback}><LoginGerentePage /></Suspense></ErrorBoundary>} />
        <Route path="/login-vendedor" element={<ErrorBoundary><Suspense fallback={SuspenseFallback}><LoginVendedorPage /></Suspense></ErrorBoundary>} />
        <Route path="/register" element={<ErrorBoundary><Suspense fallback={SuspenseFallback}><RegisterGerentePage /></Suspense></ErrorBoundary>} />
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
              <RequireRole allowedRoles={['gerente']}>
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
              <RequireRole allowedRoles={['gerente']}>
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
>>>>>>> 310ef08 (deploy)
