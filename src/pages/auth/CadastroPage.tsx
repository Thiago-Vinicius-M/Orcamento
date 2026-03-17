import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { apiClient, ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CadastroPage() {
  const [email, setEmail] = useState("")
  const [nomeEmpresa, setNomeEmpresa] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [telefone, setTelefone] = useState("")
  const [endereco, setEndereco] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!email.trim() || !nomeEmpresa.trim() || !cnpj.trim() || !telefone.trim() || !endereco.trim()) {
      toast.error("Preencha todos os campos obrigatórios.")
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post<void>("/api/auth/cadastro", {
        email: email.trim(),
        nomeEmpresa: nomeEmpresa.trim(),
        cnpj: cnpj.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim(),
      })
      setSuccess(true)
      toast.success("Cadastro realizado. Verifique seu e-mail.")
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error("Não foi possível realizar o cadastro. Tente novamente.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm text-center space-y-4">
          <h1 className="text-xl font-semibold tracking-tight">
            E-mail enviado
          </h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um e-mail de confirmação para <strong>{email}</strong>.
            Acesse o link para definir sua senha e ativar sua conta.
          </p>
          <p className="text-xs text-muted-foreground">
            Verifique também a pasta de spam.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Voltar para o login</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            Cadastro
          </h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados da empresa. Você receberá um e-mail para definir sua senha.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomeEmpresa">Nome da empresa</Label>
            <Input
              id="nomeEmpresa"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              placeholder="Minha Empresa LTDA"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua Exemplo, 123 - Bairro"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Enviando..." : "Cadastrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary font-medium underline underline-offset-4 hover:no-underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
