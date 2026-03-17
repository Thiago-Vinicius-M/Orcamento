import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate, type Location } from "react-router-dom"
import { toast } from "sonner"
import { apiClient, ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { setAuthRedirectPath, consumeAuthRedirectPath } from "@/lib/auth"

interface LoginResponse {
  token: string
  usuario: { id: number; email: string; nome: string; empresaId: number }
  empresa: { id: number; nome: string; cnpj: string; email: string; telefone: string; endereco: string } | null
}

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: Location })?.from
  const redirectPath = from?.pathname && from.pathname !== "/login" ? from.pathname : "/"

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!email.trim() || !senha) {
      toast.error("Informe e-mail e senha.")
      return
    }

    setIsSubmitting(true)
    try {
      setAuthRedirectPath(redirectPath)

      const data = await apiClient.post<LoginResponse>("/api/auth/login", {
        email: email.trim(),
        senha,
      })

      if (!data.empresa) {
        toast.error("Dados inválidos. Tente novamente.")
        return
      }

      login({
        token: data.token,
        usuario: data.usuario,
        empresa: data.empresa,
      })

      toast.success("Login realizado com sucesso!")
      const path = consumeAuthRedirectPath() ?? "/"
      navigate(path, { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error("Não foi possível entrar. Tente novamente.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            Acesse seu painel
          </h1>
          <p className="text-sm text-muted-foreground">
            Entre com seu e-mail e senha.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={handleSubmit}
        >
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
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Primeiro acesso?{" "}
          <Link to="/cadastro" className="text-primary font-medium underline underline-offset-4 hover:no-underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
