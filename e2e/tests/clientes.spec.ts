import { test, expect } from "@playwright/test"
import { ClientesPage } from "../pages/ClientesPage"
import {
  clienteValido,
  clienteInvalido,
  clienteComNome,
} from "../fixtures/test-data"
import { LoginPage } from "../pages/LoginPage"

test.describe("Clientes", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login("e2e.teste@orcamento.local", "playwright123")
    await loginPage.assertLoggedIn()
  })

  test("criar cliente com dados válidos", async ({ page }) => {
    const clientesPage = new ClientesPage(page)
    const nome = `Cliente E2E ${Date.now()}`
    const dados = clienteComNome(nome)

    await clientesPage.goto()
    await clientesPage.criarCliente(dados)
    await clientesPage.verificarToast("cadastrado com sucesso")
    await clientesPage.verificarClienteNaTabela(nome)
  })

  test("editar cliente", async ({ page }) => {
    const clientesPage = new ClientesPage(page)
    const nomeOriginal = `Editável ${Date.now()}`
    const dados = clienteComNome(nomeOriginal)

    await clientesPage.goto()
    await clientesPage.criarCliente(dados)
    await clientesPage.verificarToast("cadastrado com sucesso")

    const nomeAlterado = `${nomeOriginal} Alterado`
    await clientesPage.editarCliente(nomeOriginal)
    await clientesPage.preencherFormulario({ ...dados, nome: nomeAlterado })
    await clientesPage.submeterFormulario()
    await clientesPage.verificarToast("atualizado com sucesso")
    await clientesPage.verificarClienteNaTabela(nomeAlterado)
  })

  test("buscar cliente por nome", async ({ page }) => {
    const clientesPage = new ClientesPage(page)
    const nome = `Busca ${Date.now()}`
    const dados = clienteComNome(nome)

    await clientesPage.goto()
    await clientesPage.criarCliente(dados)
    await clientesPage.verificarToast("cadastrado com sucesso")

    await clientesPage.buscar(nome)
    await clientesPage.verificarClienteNaTabela(nome)
  })

  test("excluir cliente", async ({ page }) => {
    const clientesPage = new ClientesPage(page)
    const nome = `Excluir ${Date.now()}`
    const dados = clienteComNome(nome)

    await clientesPage.goto()
    await clientesPage.criarCliente(dados)
    await clientesPage.verificarToast("cadastrado com sucesso")
    await clientesPage.excluirCliente(nome)
    await clientesPage.verificarToast("excluído com sucesso")
    await expect(page.getByRole("cell", { name: nome })).not.toBeVisible()
  })

  test("validação: formulário vazio não submete", async ({ page }) => {
    const clientesPage = new ClientesPage(page)
    await clientesPage.goto()
    await clientesPage.clicarNovoCliente()
    await clientesPage.submeterFormulario()
    await clientesPage.verificarMensagemErro(
      "nome",
      "Nome deve ter pelo menos 3 caracteres"
    )
  })

  test("validação: nome com menos de 3 caracteres", async ({ page }) => {
    const clientesPage = new ClientesPage(page)
    await clientesPage.goto()
    await clientesPage.clicarNovoCliente()
    await clientesPage.preencherFormulario({ ...clienteValido, nome: "AB" })
    await clientesPage.submeterFormulario()
    await clientesPage.verificarMensagemErro("nome", "Nome deve ter pelo menos 3 caracteres")
  })

  test("validação: CPF/CNPJ inválido", async ({ page }) => {
    const clientesPage = new ClientesPage(page)
    await clientesPage.goto()
    await clientesPage.clicarNovoCliente()
    await clientesPage.preencherFormulario({
      ...clienteValido,
      nome: "Maria Teste",
      cpfCnpj: "111.111.111-11",
      telefone: "11999990000",
    })
    await clientesPage.submeterFormulario()
    await clientesPage.verificarMensagemErro("cpfCnpj", "CPF ou CNPJ inválido")
  })

  test("validação: telefone inválido", async ({ page }) => {
    const clientesPage = new ClientesPage(page)
    await clientesPage.goto()
    await clientesPage.clicarNovoCliente()
    await clientesPage.preencherFormulario({
      ...clienteValido,
      telefone: "123",
    })
    await clientesPage.submeterFormulario()
    await clientesPage.verificarMensagemErro("telefone", "Telefone inválido")
  })
})
