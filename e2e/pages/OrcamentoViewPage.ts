import { type Page } from "@playwright/test"

export class OrcamentoViewPage {
  constructor(private readonly page: Page) {}

  async verificarNumero(numero: string) {
    await this.page.getByText(new RegExp(numero)).first().waitFor({ state: "visible" })
  }

  async verificarStatus(status: string) {
    await this.page.getByText(status).first().waitFor({ state: "visible" })
  }

  async verificarCliente(nome: string) {
    await this.page.getByText(nome).first().waitFor({ state: "visible" })
  }

  async verificarTotal(valorFormatado: string) {
    await this.page.getByText(valorFormatado).waitFor({ state: "visible" })
  }

  async aprovar() {
    await this.page.getByRole("button", { name: "Aprovar" }).click()
    await this.page.getByRole("alertdialog").getByRole("button", { name: "Aprovar" }).click()
  }

  async cancelarOrcamento() {
    await this.page.getByRole("button", { name: "Cancelar" }).first().click()
    await this.page.getByRole("alertdialog").getByRole("button", { name: "Cancelar Orçamento" }).click()
  }

  async editarOrcamento() {
    await this.page.getByRole("button", { name: "Editar" }).click()
    await this.page.waitForURL(/\/orcamentos\/\d+\/editar/)
  }

  async duplicarOrcamento() {
    await this.page.getByRole("button", { name: "Duplicar" }).click()
  }
}
