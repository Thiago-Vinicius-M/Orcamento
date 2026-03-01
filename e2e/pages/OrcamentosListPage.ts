import { type Page } from "@playwright/test"

export class OrcamentosListPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/orcamentos")
    await this.page.waitForLoadState("networkidle")
  }

  async clicarNovoOrcamento() {
    await this.page.getByRole("button", { name: "Novo Orçamento" }).first().click()
    await this.page.waitForURL(/\/orcamentos\/novo/)
  }

  async buscar(texto: string) {
    await this.page.getByPlaceholder("Buscar por cliente ou número...").fill(texto)
    await this.page.waitForTimeout(300)
  }

  async filtrarPorStatus(status: "Todos" | "Vigente" | "Expirado" | "Aprovado" | "Cancelado") {
    await this.page.getByRole("button", { name: new RegExp(status, "i") }).first().click()
  }

  async filtrarPorData(de: string, ate: string) {
    await this.page.getByTitle("Data inicial").fill(de)
    await this.page.getByTitle("Data final").fill(ate)
  }

  async limparFiltros() {
    await this.page.getByRole("button", { name: "Limpar filtros" }).click()
  }

  async visualizarOrcamento(numeroOuCliente: string) {
    const row = this.page.getByRole("row").filter({ hasText: numeroOuCliente })
    await row.getByRole("button", { name: "Visualizar" }).click()
    await this.page.waitForURL(/\/orcamentos\/\d+$/)
  }

  async editarOrcamento(numeroOuCliente: string) {
    const row = this.page.getByRole("row").filter({ hasText: numeroOuCliente })
    await row.getByRole("button", { name: "Editar" }).click()
    await this.page.waitForURL(/\/orcamentos\/\d+\/editar/)
  }

  async duplicarOrcamento(numeroOuCliente: string) {
    const row = this.page.getByRole("row").filter({ hasText: numeroOuCliente })
    await row.getByRole("button", { name: "Duplicar" }).click()
  }

  async excluirOrcamento(numeroOuCliente: string) {
    const row = this.page.getByRole("row").filter({ hasText: numeroOuCliente })
    await row.getByRole("button", { name: "Excluir" }).click()
    await this.page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click()
  }

  async verificarOrcamentoNaLista(texto: string) {
    await this.page.getByRole("row").filter({ hasText: texto }).waitFor({ state: "visible" })
  }

  async verificarEmptyState(title: string) {
    await this.page.getByText(title).waitFor({ state: "visible" })
  }
}
