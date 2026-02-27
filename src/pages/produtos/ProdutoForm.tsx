import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { produtoSchema } from "@/schemas/produto"
import type { ProdutoFormData } from "@/schemas/produto"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Produto } from "@/types"

const CATEGORIAS_PADRAO = [
  "Scooter Elétrica",
  "Bateria",
  "Carregador",
  "Peça de Reposição",
  "Acessório",
  "Capacete",
  "Outro",
]

interface ProdutoFormProps {
  produto?: Produto
  onSubmit: (data: ProdutoFormData) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  categoriasExistentes?: string[]
}

export function ProdutoForm({
  produto,
  onSubmit,
  onCancel,
  isSubmitting,
  categoriasExistentes = [],
}: ProdutoFormProps) {
  const categorias = Array.from(
    new Set([...CATEGORIAS_PADRAO, ...categoriasExistentes])
  ).sort()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(produtoSchema),
    defaultValues: produto
      ? {
          nome: produto.nome,
          descricao: produto.descricao,
          preco: produto.preco,
          codigoSku: produto.codigoSku,
          categoria: produto.categoria,
          imagem: produto.imagem ?? "",
          ativo: produto.ativo,
        }
      : {
          nome: "",
          descricao: "",
          preco: 0,
          codigoSku: "",
          categoria: "",
          imagem: "",
          ativo: true,
        },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">
          Informações do Produto
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              placeholder="Ex: Scooter X Pro 2000W"
              {...register("nome")}
              aria-invalid={!!errors.nome}
            />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigoSku">Código / SKU *</Label>
            <Input
              id="codigoSku"
              placeholder="Ex: SCT-001"
              {...register("codigoSku")}
              aria-invalid={!!errors.codigoSku}
            />
            {errors.codigoSku && (
              <p className="text-xs text-destructive">
                {errors.codigoSku.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="preco">Preço (R$) *</Label>
            <Input
              id="preco"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              {...register("preco", { valueAsNumber: true })}
              aria-invalid={!!errors.preco}
            />
            {errors.preco && (
              <p className="text-xs text-destructive">
                {errors.preco.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="categoria">Categoria *</Label>
            <Controller
              control={control}
              name="categoria"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!errors.categoria}
                  >
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoria && (
              <p className="text-xs text-destructive">
                {errors.categoria.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva o produto..."
              rows={3}
              {...register("descricao")}
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
          {isSubmitting ? "Salvando..." : produto ? "Salvar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  )
}
