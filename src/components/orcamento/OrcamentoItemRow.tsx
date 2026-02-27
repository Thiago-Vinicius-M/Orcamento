import { Controller } from "react-hook-form"
import type {
  Control,
  UseFormRegister,
  UseFormSetValue,
  FieldErrors,
} from "react-hook-form"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/formatters"
import type { OrcamentoFormData } from "@/schemas/orcamento"
import type { Produto } from "@/types"

interface OrcamentoItemRowProps {
  index: number
  control: Control<OrcamentoFormData>
  register: UseFormRegister<OrcamentoFormData>
  errors: FieldErrors<OrcamentoFormData>
  setValue: UseFormSetValue<OrcamentoFormData>
  produtos: Produto[] | undefined
  itemSubtotal: number
  onRemove: () => void
}

export function OrcamentoItemRow({
  index,
  control,
  register,
  errors,
  setValue,
  produtos,
  itemSubtotal,
  onRemove,
}: OrcamentoItemRowProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Item {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-12">
        <div className="sm:col-span-5 space-y-1.5">
          <Label>Produto *</Label>
          <Controller
            control={control}
            name={`itens.${index}.produtoId`}
            render={({ field: f }) => (
              <Select
                value={f.value ? String(f.value) : ""}
                onValueChange={(v) => {
                  const prodId = Number(v)
                  f.onChange(prodId)
                  const produto = produtos?.find((p) => p.id === prodId)
                  if (produto) {
                    setValue(`itens.${index}.precoUnitario`, produto.preco)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtos?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id!)}>
                      {p.nome} — {formatCurrency(p.preco)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.itens?.[index]?.produtoId && (
            <p className="text-xs text-destructive">
              {errors.itens[index].produtoId.message}
            </p>
          )}
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Qtd *</Label>
          <Input
            type="number"
            min="1"
            {...register(`itens.${index}.quantidade`, {
              valueAsNumber: true,
            })}
            aria-invalid={!!errors.itens?.[index]?.quantidade}
          />
          {errors.itens?.[index]?.quantidade && (
            <p className="text-xs text-destructive">
              {errors.itens[index].quantidade.message}
            </p>
          )}
        </div>
        <div className="sm:col-span-3 space-y-1.5">
          <Label>Preço Unit. (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register(`itens.${index}.precoUnitario`, {
              valueAsNumber: true,
            })}
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Subtotal</Label>
          <div className="h-9 flex items-center text-sm font-medium">
            {formatCurrency(itemSubtotal)}
          </div>
        </div>
      </div>
    </div>
  )
}
