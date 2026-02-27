import { useState, useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLiveQuery } from "dexie-react-hooks"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
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
import { orcamentoSchema, type OrcamentoFormData } from "@/schemas/orcamento"
import { orcamentoService } from "@/services/orcamentoService"
import { clienteService } from "@/services/clienteService"
import { produtoService } from "@/services/produtoService"
import { toast } from "sonner"
import { formatCurrency, formatCpfCnpj } from "@/lib/formatters"
import { FORMAS_PAGAMENTO } from "@/lib/constants"
import { LoadingState } from "@/components/LoadingState"

export function OrcamentoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const [discountMode, setDiscountMode] = useState<"percentage" | "value">(
    "percentage",
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(isEditing)

  const clientes = useLiveQuery(() => clienteService.getAll())
  const produtos = useLiveQuery(async () => {
    const all = await produtoService.getAll()
    return all.filter((p) => p.ativo)
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OrcamentoFormData>({
    resolver: zodResolver(orcamentoSchema),
    defaultValues: {
      clienteId: 0,
      descontoValor: 0,
      descontoPercentual: 0,
      observacoes: "",
      itens: [],
      condicoesPagamento: [],
    },
  })

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control, name: "itens" })

  const {
    fields: condFields,
    append: appendCond,
    remove: removeCond,
  } = useFieldArray({ control, name: "condicoesPagamento" })

  useEffect(() => {
    if (!id) return
    async function load() {
      const data = await orcamentoService.getById(Number(id))
      if (!data) {
        navigate("/orcamentos")
        return
      }
      reset({
        clienteId: data.orcamento.clienteId,
        descontoValor: data.orcamento.descontoValor,
        descontoPercentual: data.orcamento.descontoPercentual,
        observacoes: data.orcamento.observacoes,
        itens: data.itens.map((item) => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
        })),
        condicoesPagamento: data.condicoes.map((cond) => ({
          formaPagamento: cond.formaPagamento,
          parcelas: cond.parcelas,
          valorParcela: cond.valorParcela,
          valorTotal: cond.valorTotal,
          descontoPercentual: cond.descontoPercentual,
          observacoes: cond.observacoes,
        })),
      })
      if (
        data.orcamento.descontoValor > 0 &&
        data.orcamento.descontoPercentual === 0
      ) {
        setDiscountMode("value")
      }
      setIsLoading(false)
    }
    load()
  }, [id, navigate, reset])

  const watchedItens = watch("itens")
  const watchedDescontoPercentual = watch("descontoPercentual")
  const watchedDescontoValor = watch("descontoValor")
  const watchedConditions = watch("condicoesPagamento")

  const subtotal = useMemo(() => {
    return (watchedItens || []).reduce(
      (sum, item) =>
        sum + (item?.quantidade || 0) * (item?.precoUnitario || 0),
      0,
    )
  }, [watchedItens])

  const descontoEfetivo = useMemo(() => {
    if (discountMode === "percentage") {
      return subtotal * ((watchedDescontoPercentual || 0) / 100)
    }
    return Math.min(watchedDescontoValor || 0, subtotal)
  }, [discountMode, subtotal, watchedDescontoPercentual, watchedDescontoValor])

  const total = Math.max(0, subtotal - descontoEfetivo)

  const computedConditions = useMemo(() => {
    return (watchedConditions || []).map((cond) => {
      const desconto = cond?.descontoPercentual || 0
      const condTotal = total * (1 - desconto / 100)
      const parcelas = cond?.parcelas || 1
      const condParcela = parcelas > 0 ? condTotal / parcelas : 0
      return { valorTotal: condTotal, valorParcela: condParcela }
    })
  }, [total, watchedConditions])

  async function onSubmit(data: OrcamentoFormData) {
    setIsSubmitting(true)
    try {
      if (discountMode === "percentage") {
        data.descontoValor = 0
      } else {
        data.descontoPercentual = 0
      }

      if (isEditing) {
        await orcamentoService.update(Number(id), data)
        toast.success("Orçamento atualizado com sucesso!")
        navigate(`/orcamentos/${id}`)
      } else {
        const newId = await orcamentoService.create(data)
        toast.success("Orçamento criado com sucesso!")
        navigate(`/orcamentos/${newId}`)
      }
    } catch {
      toast.error("Erro ao salvar orçamento. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleAddItem() {
    appendItem({ produtoId: 0, quantidade: 1, precoUnitario: 0 })
  }

  function handleAddCondition() {
    appendCond({
      formaPagamento: "pix",
      parcelas: 1,
      valorParcela: 0,
      valorTotal: 0,
      descontoPercentual: 0,
      observacoes: "",
    })
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 mt-1 sm:mt-0"
          onClick={() =>
            navigate(isEditing ? `/orcamentos/${id}` : "/orcamentos")
          }
        >
          <ArrowLeft />
        </Button>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isEditing ? "Editar Orçamento" : "Novo Orçamento"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Altere os dados do orçamento abaixo."
              : "Preencha os dados para criar um novo orçamento."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Client */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Cliente</h3>
          <Controller
            control={control}
            name="clienteId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <SelectTrigger
                  className="w-full"
                  aria-invalid={!!errors.clienteId}
                >
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id!)}>
                      {c.nome} — {formatCpfCnpj(c.cpfCnpj)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.clienteId && (
            <p className="text-xs text-destructive">
              {errors.clienteId.message}
            </p>
          )}
        </section>

        <Separator />

        {/* Items */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Itens do Orçamento</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
            >
              <Plus />
              Adicionar Item
            </Button>
          </div>

          {itemFields.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Nenhum item adicionado. Clique em &quot;Adicionar Item&quot; para
              começar.
            </div>
          ) : (
            <div className="space-y-3">
              {itemFields.map((field, index) => {
                const itemSub =
                  (watchedItens?.[index]?.quantidade || 0) *
                  (watchedItens?.[index]?.precoUnitario || 0)
                return (
                  <div
                    key={field.id}
                    className="rounded-lg border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Item {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeItem(index)}
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
                                const produto = produtos?.find(
                                  (p) => p.id === prodId,
                                )
                                if (produto) {
                                  setValue(
                                    `itens.${index}.precoUnitario`,
                                    produto.preco,
                                  )
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione um produto" />
                              </SelectTrigger>
                              <SelectContent>
                                {produtos?.map((p) => (
                                  <SelectItem
                                    key={p.id}
                                    value={String(p.id!)}
                                  >
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
                          {formatCurrency(itemSub)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {(errors.itens?.message || errors.itens?.root?.message) && (
            <p className="text-xs text-destructive">
              {errors.itens?.message || errors.itens?.root?.message}
            </p>
          )}
        </section>

        <Separator />

        {/* Discount & Summary */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Desconto</h3>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="discountMode"
                checked={discountMode === "percentage"}
                onChange={() => {
                  setDiscountMode("percentage")
                  setValue("descontoValor", 0)
                }}
                className="accent-primary"
              />
              <span className="text-sm">Percentual (%)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="discountMode"
                checked={discountMode === "value"}
                onChange={() => {
                  setDiscountMode("value")
                  setValue("descontoPercentual", 0)
                }}
                className="accent-primary"
              />
              <span className="text-sm">Valor fixo (R$)</span>
            </label>
          </div>

          <div className="max-w-xs">
            {discountMode === "percentage" ? (
              <div className="space-y-1.5">
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                  {...register("descontoPercentual", { valueAsNumber: true })}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Desconto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  {...register("descontoValor", { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {descontoEfetivo > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>
                  Desconto
                  {discountMode === "percentage"
                    ? ` (${watchedDescontoPercentual || 0}%)`
                    : ""}
                </span>
                <span>- {formatCurrency(descontoEfetivo)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </section>

        <Separator />

        {/* Payment Conditions */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Condições de Pagamento</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCondition}
            >
              <Plus />
              Adicionar
            </Button>
          </div>

          {condFields.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Nenhuma condição adicionada. Clique em &quot;Adicionar&quot; para
              criar cenários de pagamento.
            </div>
          ) : (
            <div className="space-y-3">
              {condFields.map((field, index) => {
                const computed = computedConditions[index]
                return (
                  <div
                    key={field.id}
                    className="rounded-lg border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Condição {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeCond(index)}
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
                            <Select
                              value={f.value}
                              onValueChange={f.onChange}
                            >
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
                          {...register(
                            `condicoesPagamento.${index}.parcelas`,
                            { valueAsNumber: true },
                          )}
                        />
                        {errors.condicoesPagamento?.[index]?.parcelas && (
                          <p className="text-xs text-destructive">
                            {
                              errors.condicoesPagamento[index].parcelas
                                .message
                            }
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
                          {...register(
                            `condicoesPagamento.${index}.observacoes`,
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-md bg-muted/50 p-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-medium">
                          {formatCurrency(computed?.valorTotal ?? 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Parcela:{" "}
                        </span>
                        <span className="font-medium">
                          {watchedConditions?.[index]?.parcelas || 1}x de{" "}
                          {formatCurrency(computed?.valorParcela ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {(errors.condicoesPagamento?.message ||
            errors.condicoesPagamento?.root?.message) && (
            <p className="text-xs text-destructive">
              {errors.condicoesPagamento?.message ||
                errors.condicoesPagamento?.root?.message}
            </p>
          )}
        </section>

        <Separator />

        {/* Notes */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Observações</h3>
          <Textarea
            placeholder="Informações adicionais sobre o orçamento..."
            rows={3}
            {...register("observacoes")}
          />
        </section>

        <Separator />

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(isEditing ? `/orcamentos/${id}` : "/orcamentos")
            }
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Salvando..."
              : isEditing
                ? "Salvar Alterações"
                : "Criar Orçamento"}
          </Button>
        </div>
      </form>
    </div>
  )
}
