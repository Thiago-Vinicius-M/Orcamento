import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { orcamentoService } from "@/services/orcamentoService"
import {
  generateOrcamentoPdf,
  LojaNotConfiguredError,
} from "@/services/pdfService"

export function useOrcamentoActions() {
  const navigate = useNavigate()
  const [duplicating, setDuplicating] = useState(false)
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null)

  const handleDuplicate = useCallback(
    async (id: number) => {
      setDuplicating(true)
      try {
        const newId = await orcamentoService.duplicate(id)
        toast.success("Orçamento duplicado com sucesso!")
        navigate(`/orcamentos/${newId}`)
      } catch {
        toast.error("Erro ao duplicar orçamento.")
      } finally {
        setDuplicating(false)
      }
    },
    [navigate],
  )

  const handleGeneratePdf = useCallback(async (id: number) => {
    setGeneratingPdfId(id)
    try {
      await generateOrcamentoPdf(id)
      toast.success("PDF gerado com sucesso!")
    } catch (err) {
      if (err instanceof LojaNotConfiguredError) {
        toast.error(err.message)
      } else {
        toast.error("Erro ao gerar PDF.")
      }
    } finally {
      setGeneratingPdfId(null)
    }
  }, [])

  const handleDelete = useCallback(async (id: number) => {
    try {
      await orcamentoService.remove(id)
      toast.success("Orçamento excluído com sucesso!")
    } catch {
      toast.error("Erro ao excluir orçamento.")
    }
  }, [])

  return {
    duplicating,
    generatingPdfId,
    handleDuplicate,
    handleGeneratePdf,
    handleDelete,
  }
}
