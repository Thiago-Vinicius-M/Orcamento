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
