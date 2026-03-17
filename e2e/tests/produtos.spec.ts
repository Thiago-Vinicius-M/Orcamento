import { test, expect } from "@playwright/test"
import { ProdutosPage } from "../pages/ProdutosPage"
import {
  produtoValido,
  produtoInvalido,
  produtoComNome,
} from "../fixtures/test-data"
import { LoginPage } from "../pages/LoginPage"

test.describe("Produtos", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login("e2e.teste@orcamento.local", "playwright123")
    await loginPage.assertLoggedIn()
  })

  test("criar produto com dados válidos", async ({ page }) => {
    const produtosPage = new ProdutosPage(page)
    const nome = `Produto E2E ${Date.now()}`
    const sku = `SKU-${Date.now()}`
    const dados = produtoComNome(nome, sku)

    await produtosPage.goto()
    await produtosPage.criarProduto(dados)
    await produtosPage.verificarToast("cadastrado com sucesso")
    await produtosPage.verificarProdutoNaTabela(nome)
  })

  test("editar produto", async ({ page }) => {
    const produtosPage = new ProdutosPage(page)
    const nomeOriginal = `Prod Edit ${Date.now()}`
    const dados = produtoComNome(nomeOriginal, `SKU-EDIT-${Date.now()}`)

    await produtosPage.goto()
    await produtosPage.criarProduto(dados)
    await produtosPage.verificarToast("cadastrado com sucesso")

    const nomeAlterado = `${nomeOriginal} Alterado`
    await produtosPage.editarProduto(nomeOriginal)
    await produtosPage.preencherFormulario({ ...dados, nome: nomeAlterado })
    await produtosPage.submeterFormulario()
    await produtosPage.verificarToast("atualizado com sucesso")
    await produtosPage.verificarProdutoNaTabela(nomeAlterado)
  })

  test("buscar produto por nome", async ({ page }) => {
    const produtosPage = new ProdutosPage(page)
    const nome = `Busca Prod ${Date.now()}`
    const dados = produtoComNome(nome, `SKU-BUSCA-${Date.now()}`)

    await produtosPage.goto()
    await produtosPage.criarProduto(dados)
    await produtosPage.verificarToast("cadastrado com sucesso")

    await produtosPage.buscar(nome)
    await produtosPage.verificarProdutoNaTabela(nome)
  })

  test("desativar e reativar produto", async ({ page }) => {
    const produtosPage = new ProdutosPage(page)
    const nome = `Toggle ${Date.now()}`
    const dados = produtoComNome(nome, `SKU-TOGGLE-${Date.now()}`)

    await produtosPage.goto()
    await produtosPage.criarProduto(dados)
    await produtosPage.verificarToast("cadastrado com sucesso")

    await produtosPage.desativarProduto(nome)
    await produtosPage.verificarToast("desativado")
    await produtosPage.filtrarStatus("Inativos")
    await produtosPage.verificarProdutoNaTabela(nome)

    await produtosPage.reativarProduto(nome)
    await produtosPage.verificarToast("reativado")
  })

  test("validação: nome com menos de 2 caracteres", async ({ page }) => {
    const produtosPage = new ProdutosPage(page)
    await produtosPage.goto()
    await produtosPage.clicarNovoProduto()
    await produtosPage.preencherFormulario({
      ...produtoInvalido,
      nome: "A",
      codigoSku: "X",
      preco: 10,
      categoria: "Outro",
    })
    await produtosPage.submeterFormulario()
    await produtosPage.verificarMensagemErro("Nome deve ter pelo menos 2 caracteres")
  })

  test("validação: preço zero", async ({ page }) => {
    const produtosPage = new ProdutosPage(page)
    await produtosPage.goto()
    await produtosPage.clicarNovoProduto()
    await produtosPage.preencherFormulario({
      ...produtoValido,
      nome: "Produto Preco Zero",
      codigoSku: "SKU-ZERO",
      preco: 0,
    })
    await produtosPage.submeterFormulario()
    await produtosPage.verificarMensagemErro("Preço deve ser maior que zero")
  })

  test("validação: categoria obrigatória", async ({ page }) => {
    const produtosPage = new ProdutosPage(page)
    await produtosPage.goto()
    await produtosPage.clicarNovoProduto()
    await produtosPage.preencherFormulario({
      ...produtoValido,
      nome: "Sem Categoria",
      codigoSku: "SKU-NOCAT",
      categoria: "",
    })
    await produtosPage.submeterFormulario()
    await produtosPage.verificarMensagemErro("Categoria é obrigatória")
  })
})
