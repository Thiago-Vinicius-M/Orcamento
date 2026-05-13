import { type Page } from "@playwright/test"

export interface ClienteFormData {
  nome: string
  cpfCnpj: string
  telefone: string
  email?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
}

export class ClientesPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/clientes")
    await this.page.waitForLoadState("networkidle")
  }

  async clicarNovoCliente() {
    await this.page.getByRole("button", { name: "Novo Cliente" }).first().click()
    await this.page.getByRole("dialog").waitFor({ state: "visible" })
  }

  async preencherFormulario(dados: ClienteFormData) {
    await this.page.getByLabel("Nome completo").fill(dados.nome)
    await this.page.getByLabel("CPF / CNPJ").fill(dados.cpfCnpj)
    await this.page.getByLabel("Telefone").fill(dados.telefone)
    if (dados.email != null) {
      await this.page.getByLabel("E-mail").fill(dados.email)
    }
    if (dados.logradouro) await this.page.getByLabel("Logradouro").fill(dados.logradouro)
    if (dados.numero) await this.page.getByLabel("Número").fill(dados.numero)
    if (dados.bairro) await this.page.getByLabel("Bairro").fill(dados.bairro)
    if (dados.cidade) await this.page.getByLabel("Cidade").fill(dados.cidade)
    if (dados.estado) await this.page.getByLabel("UF").fill(dados.estado)
    if (dados.cep) await this.page.getByLabel("CEP").fill(dados.cep)
  }

  async submeterFormulario() {
    const dialog = this.page.getByRole("dialog")
    await dialog.getByRole("button", { name: /Cadastrar|Salvar/ }).click()
  }

  async criarCliente(dados: ClienteFormData) {
    await this.clicarNovoCliente()
    await this.preencherFormulario(dados)
    await this.submeterFormulario()
  }

  async buscar(texto: string) {
    await this.page.getByLabel("Buscar clientes por nome ou documento").fill(texto)
    await this.page.waitForTimeout(300)
  }

  async editarCliente(nome: string) {
    const row = this.page.getByRole("row").filter({ hasText: nome })
    await row.getByRole("button", { name: "Editar" }).click()
    await this.page.getByRole("dialog").waitFor({ state: "visible" })
  }

  async excluirCliente(nome: string) {
    const row = this.page.getByRole("row").filter({ hasText: nome })
    await row.getByRole("button", { name: "Excluir" }).click()
    const confirmDialog = this.page.getByRole("alertdialog")
    await confirmDialog.getByRole("button", { name: "Excluir" }).click()
  }

  async verificarClienteNaTabela(nome: string) {
    await this.page.getByRole("cell", { name: nome }).waitFor({ state: "visible" })
  }

  async verificarMensagemErro(_campo: string, msg: string) {
    await this.page.getByText(msg).waitFor({ state: "visible", timeout: 8000 })
  }

  async verificarToast(msg: string) {
    const toaster = this.page.locator("[data-sonner-toaster]")
    await toaster.getByText(msg, { exact: false }).waitFor({ state: "visible", timeout: 10000 })
  }

  async verificarEmptyState(title: string) {
    await this.page.getByText(title).waitFor({ state: "visible" })
  }
}
