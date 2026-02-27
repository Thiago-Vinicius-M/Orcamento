import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { lojaSchema, type LojaFormData } from "@/schemas/loja"
import { lojaService } from "@/services/lojaService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Save, Upload, X, ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { formatCpfCnpj, formatPhone } from "@/lib/formatters"
import { useMaskedChangeHandler } from "@/hooks/useInputMask"
import { LoadingState } from "@/components/LoadingState"

const MAX_LOGO_SIZE = 512 * 1024
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]

export function ConfiguracoesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LojaFormData>({
    resolver: zodResolver(lojaSchema),
    defaultValues: {
      nome: "",
      cnpj: "",
      endereco: "",
      telefone: "",
      email: "",
      logo: "",
    },
  })

  const handleCnpjChange = useMaskedChangeHandler(
    formatCpfCnpj,
    14,
    (v) => setValue("cnpj", v, { shouldValidate: true }),
  )
  const handleTelefoneChange = useMaskedChangeHandler(
    formatPhone,
    11,
    (v) => setValue("telefone", v, { shouldValidate: true }),
  )

  useEffect(() => {
    loadLoja()
  }, [])

  async function loadLoja() {
    try {
      const loja = await lojaService.get()
      if (loja) {
        reset({
          nome: loja.nome,
          cnpj: loja.cnpj ? formatCpfCnpj(loja.cnpj) : "",
          endereco: loja.endereco,
          telefone: loja.telefone ? formatPhone(loja.telefone) : "",
          email: loja.email,
          logo: loja.logo ?? "",
        })
        if (loja.logo) {
          setLogoPreview(loja.logo)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmit(data: LojaFormData) {
    setIsSubmitting(true)
    try {
      await lojaService.save(data)
      toast.success("Dados da loja salvos com sucesso!")
    } catch {
      toast.error("Erro ao salvar dados. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Formato de imagem não suportado. Use JPG, PNG, WebP ou SVG.")
      return
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast.error("A imagem deve ter no máximo 512 KB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
      setValue("logo", base64, { shouldDirty: true })
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveLogo() {
    setLogoPreview(null)
    setValue("logo", "", { shouldDirty: true })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground">Configure os dados da loja.</p>
        </div>
        <LoadingState />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Configure os dados da loja que aparecem nos orçamentos.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Logo da Loja</h3>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border-2 border-dashed bg-muted/30">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo da loja"
                  className="h-full w-full rounded-lg object-contain p-2"
                />
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Imagem utilizada no cabeçalho dos orçamentos em PDF.
                <br />
                Formatos aceitos: JPG, PNG, WebP, SVG. Tamanho máximo: 512 KB.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {logoPreview ? "Trocar imagem" : "Enviar imagem"}
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Dados da Loja</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="nome">Nome da loja *</Label>
              <Input
                id="nome"
                placeholder="Ex: E-Scooter Brasil"
                {...register("nome")}
                aria-invalid={!!errors.nome}
              />
              {errors.nome && (
                <p className="text-xs text-destructive">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                {...register("cnpj")}
                onChange={handleCnpjChange}
                aria-invalid={!!errors.cnpj}
              />
              {errors.cnpj && (
                <p className="text-xs text-destructive">{errors.cnpj.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                {...register("telefone")}
                onChange={handleTelefoneChange}
                aria-invalid={!!errors.telefone}
              />
              {errors.telefone && (
                <p className="text-xs text-destructive">{errors.telefone.message}</p>
              )}
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="contato@loja.com.br"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                placeholder="Rua, número, bairro - Cidade/UF"
                {...register("endereco")}
                aria-invalid={!!errors.endereco}
              />
              {errors.endereco && (
                <p className="text-xs text-destructive">{errors.endereco.message}</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </form>
    </div>
  )
}
