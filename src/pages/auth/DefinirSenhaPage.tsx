import { useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { apiClient, ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DefinirSenhaPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")

  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage(null)

    if (!token) {
      setErrorMessage("Link inválido. Solicite um novo e-mail de confirmação.")
      return
    }

    if (senha.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.")
      return
    }

    if (senha !== confirmarSenha) {
      toast.error("As senhas não coincidem.")
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post<void>("/api/auth/definir-senha", { token, senha })
      toast.success("Senha definida com sucesso! Faça login.")
      navigate("/login", { replace: true, state: { message: "Senha definida. Faça login." } })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage("Não foi possível definir a senha. O link pode ter expirado.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm text-center space-y-4">
          <h1 className="text-xl font-semibold tracking-tight">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este link de confirmação é inválido ou está incompleto. Acesse o link que enviamos por e-mail ou solicite um novo cadastro.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link to="/login">Ir para o login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/cadastro">Cadastrar-se</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            Definir senha
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma senha para acessar seu painel (mínimo 6 caracteres).
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">
            {errorMessage}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmarSenha">Confirmar senha</Label>
            <Input
              id="confirmarSenha"
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : "Definir senha"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary font-medium underline underline-offset-4 hover:no-underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}
