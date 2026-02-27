import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { Dashboard } from "@/pages/Dashboard"
import { ClientesPage } from "@/pages/clientes/ClientesPage"
import { ProdutosPage } from "@/pages/produtos/ProdutosPage"
import { OrcamentosListPage } from "@/pages/orcamentos/OrcamentosListPage"
import { OrcamentoFormPage } from "@/pages/orcamentos/OrcamentoFormPage"
import { OrcamentoViewPage } from "@/pages/orcamentos/OrcamentoViewPage"
import { ConfiguracoesPage } from "@/pages/configuracoes/ConfiguracoesPage"
import { PWAReloadPrompt } from "@/components/PWAReloadPrompt"
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
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
      <PWAReloadPrompt />
      <PWAInstallPrompt />
      <Toaster richColors position="bottom-right" />
    </BrowserRouter>
  )
}

export default App
