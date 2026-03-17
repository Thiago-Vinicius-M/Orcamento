import { test, expect } from "@playwright/test"
import { ClientesPage } from "../pages/ClientesPage"
import { ProdutosPage } from "../pages/ProdutosPage"
import { OrcamentosListPage } from "../pages/OrcamentosListPage"
import { OrcamentoFormPage } from "../pages/OrcamentoFormPage"
import { OrcamentoViewPage } from "../pages/OrcamentoViewPage"
import { clienteComNome, produtoComNome } from "../fixtures/test-data"
import { LoginPage } from "../pages/LoginPage"

test.describe("Orçamentos", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login("e2e.teste@orcamento.local", "playwright123")
    await loginPage.assertLoggedIn()
  })

  test("fluxo completo: criar cliente, produto e orçamento", async ({ page }) => {
    const nomeCliente = `Orc Cliente ${Date.now()}`
    const nomeProduto = `Orc Produto ${Date.now()}`
    const skuProduto = `ORC-SKU-${Date.now()}`

    const clientesPage = new ClientesPage(page)
    await clientesPage.goto()
    await clientesPage.criarCliente(clienteComNome(nomeCliente))
    await clientesPage.verificarToast("cadastrado com sucesso")

    const produtosPage = new ProdutosPage(page)
    await produtosPage.goto()
    await produtosPage.criarProduto(produtoComNome(nomeProduto, skuProduto))
    await produtosPage.verificarToast("cadastrado com sucesso")

    const listPage = new OrcamentosListPage(page)
    await listPage.goto()
    await listPage.clicarNovoOrcamento()

    const formPage = new OrcamentoFormPage(page)
    await formPage.selecionarCliente(nomeCliente)
    await formPage.adicionarItem()
    await formPage.preencherItem(0, nomeProduto, 2)
    await formPage.adicionarCondicao()
    await formPage.preencherCondicao(0, "PIX", 1)
    await formPage.submeter()

    await expect(page).toHaveURL(/\/orcamentos\/\d+$/)
    const viewPage = new OrcamentoViewPage(page)
    await viewPage.verificarCliente(nomeCliente)
  })

  test("aprovar orçamento", async ({ page }) => {
    const nomeCliente = `Aprovar Cli ${Date.now()}`
    const nomeProduto = `Aprovar Prod ${Date.now()}`

    const clientesPage = new ClientesPage(page)
    await clientesPage.goto()
    await clientesPage.criarCliente(clienteComNome(nomeCliente))
    await clientesPage.verificarToast("cadastrado com sucesso")

    const produtosPage = new ProdutosPage(page)
    await produtosPage.goto()
    await produtosPage.criarProduto(produtoComNome(nomeProduto, `APR-${Date.now()}`))
    await produtosPage.verificarToast("cadastrado com sucesso")

    const listPage = new OrcamentosListPage(page)
    await listPage.goto()
    await listPage.clicarNovoOrcamento()

    const formPage = new OrcamentoFormPage(page)
    await formPage.selecionarCliente(nomeCliente)
    await formPage.adicionarItem()
    await formPage.preencherItem(0, nomeProduto, 1)
    await formPage.adicionarCondicao()
    await formPage.preencherCondicao(0, "PIX", 1)
    await formPage.submeter()

    const viewPage = new OrcamentoViewPage(page)
    await viewPage.aprovar()
    await clientesPage.verificarToast("aprovado com sucesso")
    await viewPage.verificarStatus("Aprovado")
  })

  test("validação: sem cliente selecionado", async ({ page }) => {
    const nomeProduto = `Val Cli ${Date.now()}`
    const produtosPage = new ProdutosPage(page)
    await produtosPage.goto()
    await produtosPage.criarProduto(produtoComNome(nomeProduto, `VAL-${Date.now()}`))
    await produtosPage.verificarToast("cadastrado com sucesso")

    const listPage = new OrcamentosListPage(page)
    await listPage.goto()
    await listPage.clicarNovoOrcamento()

    const formPage = new OrcamentoFormPage(page)
    await formPage.adicionarItem()
    await formPage.preencherItem(0, nomeProduto, 1)
    await formPage.adicionarCondicao()
    await formPage.preencherCondicao(0, "PIX", 1)
    await formPage.submeter()

    // Dados inválidos: validação bloqueia submit; exceção = mensagem de validação exibida
    await formPage.verificarPermaneceNoFormulario()
    await formPage.verificarMensagemValidacao("Selecione um cliente")
  })

  test("validação: sem itens", async ({ page }) => {
    const clientesPage = new ClientesPage(page)
    const nomeCliente = `Sem Itens ${Date.now()}`
    await clientesPage.goto()
    await clientesPage.criarCliente(clienteComNome(nomeCliente))
    await clientesPage.verificarToast("cadastrado com sucesso")

    const listPage = new OrcamentosListPage(page)
    await listPage.goto()
    await listPage.clicarNovoOrcamento()

    const formPage = new OrcamentoFormPage(page)
    await formPage.selecionarCliente(nomeCliente)
    await formPage.adicionarCondicao()
    await formPage.preencherCondicao(0, "PIX", 1)
    await formPage.submeter()

    // Dados inválidos: validação bloqueia submit; exceção = mensagem de validação exibida
    await formPage.verificarPermaneceNoFormulario()
    await formPage.verificarMensagemValidacao("Adicione pelo menos um item")
  })
})
