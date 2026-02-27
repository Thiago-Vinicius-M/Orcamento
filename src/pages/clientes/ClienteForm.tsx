import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { clienteSchema, type ClienteFormData } from "@/schemas/cliente"
import { isValidCpfCnpj } from "@/lib/validators"
import { formatCpfCnpj, formatPhone, formatCep } from "@/lib/formatters"
import { useMaskedChangeHandler } from "@/hooks/useInputMask"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { Cliente } from "@/types"

interface ClienteFormProps {
  cliente?: Cliente
  onSubmit: (data: ClienteFormData) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function ClienteForm({
  cliente,
  onSubmit,
  onCancel,
  isSubmitting,
}: ClienteFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: cliente
      ? {
          nome: cliente.nome,
          cpfCnpj: formatCpfCnpj(cliente.cpfCnpj),
          telefone: formatPhone(cliente.telefone),
          email: cliente.email,
          logradouro: cliente.logradouro,
          numero: cliente.numero,
          complemento: cliente.complemento,
          bairro: cliente.bairro,
          cidade: cliente.cidade,
          estado: cliente.estado,
          cep: formatCep(cliente.cep),
        }
      : {
          nome: "",
          cpfCnpj: "",
          telefone: "",
          email: "",
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          estado: "",
          cep: "",
        },
  })

  const handleCpfCnpjChange = useMaskedChangeHandler(
    formatCpfCnpj,
    14,
    (v) => setValue("cpfCnpj", v, { shouldValidate: true }),
  )
  const handleTelefoneChange = useMaskedChangeHandler(
    formatPhone,
    11,
    (v) => setValue("telefone", v, { shouldValidate: true }),
  )
  const handleCepChange = useMaskedChangeHandler(
    formatCep,
    8,
    (v) => setValue("cep", v),
  )

  async function handleFormSubmit(data: ClienteFormData) {
    if (!isValidCpfCnpj(data.cpfCnpj)) {
      setError("cpfCnpj", { message: "CPF ou CNPJ inválido" })
      return
    }
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">
          Dados Pessoais
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input id="nome" {...register("nome")} aria-invalid={!!errors.nome} />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpfCnpj">CPF / CNPJ *</Label>
            <Input
              id="cpfCnpj"
              placeholder="000.000.000-00"
              {...register("cpfCnpj")}
              onChange={handleCpfCnpjChange}
              aria-invalid={!!errors.cpfCnpj}
            />
            {errors.cpfCnpj && (
              <p className="text-xs text-destructive">
                {errors.cpfCnpj.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone *</Label>
            <Input
              id="telefone"
              placeholder="(00) 00000-0000"
              {...register("telefone")}
              onChange={handleTelefoneChange}
              aria-invalid={!!errors.telefone}
            />
            {errors.telefone && (
              <p className="text-xs text-destructive">
                {errors.telefone.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Endereço</h4>

        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-4 space-y-2">
            <Label htmlFor="logradouro">Logradouro</Label>
            <Input id="logradouro" {...register("logradouro")} />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" {...register("numero")} />
          </div>

          <div className="sm:col-span-3 space-y-2">
            <Label htmlFor="complemento">Complemento</Label>
            <Input id="complemento" {...register("complemento")} />
          </div>

          <div className="sm:col-span-3 space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" {...register("bairro")} />
          </div>

          <div className="sm:col-span-3 space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" {...register("cidade")} />
          </div>

          <div className="sm:col-span-1 space-y-2">
            <Label htmlFor="estado">UF</Label>
            <Input id="estado" maxLength={2} {...register("estado")} />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              placeholder="00000-000"
              {...register("cep")}
              onChange={handleCepChange}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : cliente ? "Salvar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  )
}
