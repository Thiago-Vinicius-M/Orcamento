import { expect, type Page } from "@playwright/test"

export class OrcamentoFormPage {
  constructor(private readonly page: Page) {}

  async selecionarCliente(nomeCliente: string) {
    await this.page.getByRole("combobox").first().click()
    await this.page.getByRole("option", { name: new RegExp(nomeCliente, "i") }).click()
  }

  async adicionarItem() {
    await this.page.getByRole("button", { name: "Adicionar Item" }).click()
  }

  async preencherItem(index: number, nomeProduto: string, quantidade: number) {
    const card = this.page.getByText(`Item ${index + 1}`).locator("../..")
    await card.getByRole("combobox").first().click()
    await this.page.getByRole("option", { name: new RegExp(nomeProduto, "i") }).click()
    await card.getByRole("spinbutton").first().fill(String(quantidade))
  }

  async adicionarCondicao() {
    await this.page.getByRole("button", { name: /Adicionar/ }).last().click()
  }

  async preencherCondicao(index: number, formaPagamento: string, parcelas: number) {
    const card = this.page.getByText(`Condição ${index + 1}`).locator("../..")
    await card.getByRole("combobox").first().click()
    await this.page.getByRole("option", { name: formaPagamento }).click()
    await card.getByRole("spinbutton").first().fill(String(parcelas))
  }

  async definirDescontoPercentual(valor: number) {
    await this.page.getByRole("radio", { name: "Percentual (%)" }).click()
    await this.page.getByLabel("Desconto (%)").fill(String(valor))
  }

  async definirDescontoValor(valor: number) {
    await this.page.getByRole("radio", { name: /Valor fixo/ }).click()
    await this.page.getByLabel("Desconto (R$)").fill(String(valor))
  }

  async preencherObservacoes(texto: string) {
    await this.page.getByPlaceholder(/Informações adicionais/).fill(texto)
  }

  async submeter() {
    await this.page.getByRole("button", { name: /Criar Orçamento|Salvar Alterações/ }).click()
  }

  async cancelar() {
    await this.page.getByRole("button", { name: "Cancelar" }).last().click()
  }

  async verificarTotal(valorEsperado: string) {
    await this.page.getByText(valorEsperado).last().waitFor({ state: "visible" })
  }

  /** Mensagem de validação exibida no formulário (parágrafo .text-destructive). */
  async verificarMensagemValidacao(texto: string) {
    await this.page
      .locator("p.text-destructive", { hasText: texto })
      .first()
      .waitFor({ state: "visible" })
  }

  /** Verifica que ainda está na página do formulário (não navegou após submit inválido). */
  async verificarPermaneceNoFormulario() {
    await expect(this.page).toHaveURL(/\/orcamentos\/novo$|\/orcamentos\/\d+\/editar$/)
  }
}
