import { Controller } from "react-hook-form"
import type { Control, UseFormRegister, FieldErrors } from "react-hook-form"
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
import { FORMAS_PAGAMENTO } from "@/lib/constants"
import type { OrcamentoFormData } from "@/schemas/orcamento"

interface OrcamentoConditionRowProps {
  index: number
  control: Control<OrcamentoFormData>
  register: UseFormRegister<OrcamentoFormData>
  errors: FieldErrors<OrcamentoFormData>
  parcelas: number
  computedTotal: number
  computedParcela: number
  onRemove: () => void
}

export function OrcamentoConditionRow({
  index,
  control,
  register,
  errors,
  parcelas,
  computedTotal,
  computedParcela,
  onRemove,
}: OrcamentoConditionRowProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Condição {index + 1}
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Forma de Pagamento</Label>
          <Controller
            control={control}
            name={`condicoesPagamento.${index}.formaPagamento`}
            render={({ field: f }) => (
              <Select value={f.value} onValueChange={f.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((fp) => (
                    <SelectItem key={fp.value} value={fp.value}>
                      {fp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Parcelas</Label>
          <Input
            type="number"
            min="1"
            {...register(`condicoesPagamento.${index}.parcelas`, {
              valueAsNumber: true,
            })}
          />
          {errors.condicoesPagamento?.[index]?.parcelas && (
            <p className="text-xs text-destructive">
              {errors.condicoesPagamento[index].parcelas.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Desconto da condição (%)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="0"
            {...register(
              `condicoesPagamento.${index}.descontoPercentual`,
              { valueAsNumber: true },
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Input
            placeholder="Ex: à vista com desconto"
            {...register(`condicoesPagamento.${index}.observacoes`)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-md bg-muted/50 p-3 text-sm">
        <div>
          <span className="text-muted-foreground">Total: </span>
          <span className="font-medium">
            {formatCurrency(computedTotal)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Parcela: </span>
          <span className="font-medium">
            {parcelas}x de {formatCurrency(computedParcela)}
          </span>
        </div>
      </div>
    </div>
  )
}
