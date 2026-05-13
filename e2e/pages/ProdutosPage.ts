import { type Page } from "@playwright/test"

export interface ProdutoFormData {
  nome: string
  descricao?: string
  preco: number
  codigoSku: string
  categoria: string
  imagem?: string
  ativo?: boolean
}

export class ProdutosPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/produtos")
    await this.page.waitForLoadState("networkidle")
  }

  async clicarNovoProduto() {
    await this.page.getByRole("button", { name: "Novo Produto" }).first().click()
    await this.page.getByRole("dialog").waitFor({ state: "visible" })
  }

  async preencherFormulario(dados: ProdutoFormData) {
    await this.page.getByLabel(/^Nome/).fill(dados.nome)
    await this.page.getByLabel("Código / SKU").fill(dados.codigoSku)
    await this.page.getByLabel("Preço (R$)").fill(String(dados.preco))
    if (dados.categoria) {
      await this.page.getByRole("combobox").first().click()
      await this.page.getByRole("option", { name: dados.categoria }).click()
    }
    if (dados.descricao) {
      await this.page.getByLabel("Descrição").fill(dados.descricao)
    }
  }

  async submeterFormulario() {
    const dialog = this.page.getByRole("dialog")
    await dialog.getByRole("button", { name: /Cadastrar|Salvar/ }).click()
  }

  async criarProduto(dados: ProdutoFormData) {
    await this.clicarNovoProduto()
    await this.preencherFormulario(dados)
    await this.submeterFormulario()
  }

  async buscar(texto: string) {
    await this.page.getByLabel("Buscar produtos por nome ou código").fill(texto)
    await this.page.waitForTimeout(300)
  }

  async filtrarCategoria(categoria: string) {
    await this.page.getByRole("combobox").first().click()
    await this.page.getByRole("option", { name: categoria }).click()
  }

  async filtrarStatus(status: "Ativos" | "Inativos") {
    await this.page.getByRole("combobox").nth(1).click()
    await this.page.getByRole("option", { name: status }).click()
  }

  async editarProduto(nome: string) {
    const row = this.page.getByRole("row").filter({ hasText: nome })
    await row.getByRole("button", { name: "Editar" }).click()
    await this.page.getByRole("dialog").waitFor({ state: "visible" })
  }

  async desativarProduto(nome: string) {
    const row = this.page.getByRole("row").filter({ hasText: nome })
    await row.getByRole("button", { name: "Desativar" }).click()
    await this.page.getByRole("alertdialog").getByRole("button", { name: "Desativar" }).click()
  }

  async reativarProduto(nome: string) {
    const row = this.page.getByRole("row").filter({ hasText: nome })
    await row.getByRole("button", { name: "Ativar" }).click()
    await this.page.getByRole("alertdialog").getByRole("button", { name: "Reativar" }).click()
  }

  async verificarProdutoNaTabela(nome: string) {
    await this.page.getByRole("cell", { name: nome }).waitFor({ state: "visible" })
  }

  async verificarMensagemErro(msg: string) {
    const dialog = this.page.getByRole("dialog")
    await dialog.getByText(msg).waitFor({ state: "visible" })
  }

  async verificarToast(msg: string) {
    const toaster = this.page.locator("[data-sonner-toaster]")
    await toaster.getByText(msg, { exact: false }).waitFor({ state: "visible", timeout: 10000 })
  }

  async verificarEmptyState(title: string) {
    await this.page.getByText(title).waitFor({ state: "visible" })
  }
}
