import { expect, type Page } from "@playwright/test"

export class OrcamentoFormPage {
  constructor(private readonly page: Page) {}

  /** Combobox do cliente (label “Cliente *” no cabeçalho “Dados principais”). */
  async selecionarCliente(nomeCliente: string) {
    await this.page.getByRole("combobox", { name: /Cliente/i }).click()
    await this.page.getByRole("option", { name: new RegExp(nomeCliente, "i") }).click()
  }

  async adicionarItem() {
    await this.page.getByRole("button", { name: /Adicionar item/i }).click()
  }

  /**
   * Linha da tabela “Itens do orçamento”: produto (SearchableSelect) + quantidade (coluna “Qtd.”).
   * Preço unitário é somente leitura — não há segundo `spinbutton` na linha.
   */
  async preencherItem(index: number, nomeProduto: string, quantidade: number) {
    const row = this.page.locator(".table tbody tr").nth(index)
    await row.getByRole("combobox").click()
    await this.page.getByRole("option", { name: new RegExp(nomeProduto, "i") }).click()
    await row.locator("td").nth(1).locator('input[type="number"]').fill(String(quantidade))
  }

  /** `<select id="pag_tipo">` — sem botão “Adicionar condição”; Pix não exige parcelas. */
  async selecionarTipoPagamento(label: string) {
    await this.page.getByLabel("Tipo de pagamento").selectOption({ label })
  }

  async definirDescontoPercentual(valor: number) {
    await this.page.getByLabel("Tipo de desconto").selectOption({ label: "Percentual (%)" })
    await this.page.getByLabel("Desconto (%)").fill(String(valor))
  }

  async definirDescontoValor(valor: number) {
    await this.page.getByLabel("Tipo de desconto").selectOption({ label: "Valor fixo (R$)" })
    await this.page.getByLabel("Desconto (R$)").fill(String(valor))
  }

  async preencherObservacoes(texto: string) {
    await this.page.getByPlaceholder(/Informações adicionais/).fill(texto)
  }

  async submeter() {
    await this.page.getByRole("button", { name: /Salvar orçamento/i }).click()
  }

  async cancelar() {
    await this.page.getByRole("button", { name: "Cancelar" }).last().click()
  }

  async verificarTotal(valorEsperado: string) {
    await this.page.getByText(valorEsperado).last().waitFor({ state: "visible" })
  }

  /** Erro de validação em `OrcamentoNovoPage` (`role="alert"`, classe `.page-error`). */
  async verificarMensagemValidacao(texto: string) {
    await this.page
      .getByRole("alert")
      .filter({ hasText: texto })
      .first()
      .waitFor({ state: "visible" })
  }

  /** Verifica que ainda está na página do formulário (não navegou após submit inválido). */
  async verificarPermaneceNoFormulario() {
    await expect(this.page).toHaveURL(/\/orcamentos\/novo$|\/orcamentos\/\d+\/editar$/)
  }
}
