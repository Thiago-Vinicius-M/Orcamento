/**
 * Dados de teste reutilizáveis para E2E (válidos e inválidos).
 */

export const clienteValido = {
  nome: "Maria Silva Teste",
  cpfCnpj: "529.982.247-25",
  telefone: "(11) 99999-0000",
  email: "maria.teste@exemplo.com",
  logradouro: "Rua das Flores",
  numero: "100",
  complemento: "Apto 1",
  bairro: "Centro",
  cidade: "São Paulo",
  estado: "SP",
  cep: "01310-100",
}

export const clienteInvalido = {
  nome: "AB",
  cpfCnpj: "111",
  telefone: "123",
  email: "email-invalido",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
}

/** Cliente com nome único para evitar conflito entre testes */
export function clienteComNome(nome: string) {
  return { ...clienteValido, nome }
}

export const produtoValido = {
  nome: "Scooter Elétrica X1",
  descricao: "Scooter para testes E2E",
  preco: 4999.9,
  codigoSku: "SCT-E2E-001",
  categoria: "Scooter Elétrica",
  imagem: "",
  ativo: true,
}

export const produtoInvalido = {
  nome: "A",
  descricao: "",
  preco: 0,
  codigoSku: "",
  categoria: "",
  imagem: "",
  ativo: true,
}

/** Produto com nome/SKU únicos para testes */
export function produtoComNome(nome: string, sku: string) {
  return { ...produtoValido, nome, codigoSku: sku }
}
