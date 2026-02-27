import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type {
  Orcamento,
  Cliente,
  ItemOrcamento,
  CondicaoPagamento,
  Loja,
  Produto,
} from "@/types"
import {
  formatCurrency,
  formatDate,
  formatCpfCnpj,
  formatPhone,
  formatCep,
  formatNumeroOrcamento,
} from "@/lib/formatters"
import { FORMA_PAGAMENTO_LABELS } from "@/lib/constants"

export interface DadosPdf {
  loja: Loja
  cliente: Cliente
  orcamento: Orcamento
  itens: (ItemOrcamento & { produto: Produto })[]
  condicoes: CondicaoPagamento[]
}

const COLORS = {
  primary: [41, 128, 185] as [number, number, number],
  dark: [44, 62, 80] as [number, number, number],
  gray: [127, 140, 141] as [number, number, number],
  lightGray: [236, 240, 241] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  tableHead: [52, 73, 94] as [number, number, number],
  tableStripe: [245, 247, 250] as [number, number, number],
}

const MARGIN = { left: 14, right: 14 }

function getPageWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth()
}

function getContentWidth(doc: jsPDF): number {
  return getPageWidth(doc) - MARGIN.left - MARGIN.right
}

function getPageHeight(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight()
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.primary)
  doc.text(title, MARGIN.left, y)

  const lineY = y + 1.5
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(0.5)
  doc.line(MARGIN.left, lineY, getPageWidth(doc) - MARGIN.right, lineY)

  return lineY + 5
}

function ensureSpace(doc: jsPDF, currentY: number, needed: number): number {
  if (currentY + needed > getPageHeight(doc) - 20) {
    doc.addPage()
    return 20
  }
  return currentY
}

function drawHeader(doc: jsPDF, loja: Loja, orcamento: Orcamento): number {
  let y = 15

  const hasLogo = !!loja.logo
  const textStartX = hasLogo ? MARGIN.left + 35 : MARGIN.left

  if (hasLogo) {
    try {
      doc.addImage(loja.logo!, "JPEG", MARGIN.left, y - 3, 30, 30)
    } catch {
      // If the logo can't be rendered, fall back to text-only header
    }
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(...COLORS.dark)
  doc.text(loja.nome, textStartX, y + 3)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.gray)

  let infoY = y + 9
  if (loja.cnpj) {
    doc.text(`CNPJ: ${formatCpfCnpj(loja.cnpj)}`, textStartX, infoY)
    infoY += 4
  }
  if (loja.endereco) {
    doc.text(loja.endereco, textStartX, infoY)
    infoY += 4
  }

  const contactParts: string[] = []
  if (loja.telefone) contactParts.push(formatPhone(loja.telefone))
  if (loja.email) contactParts.push(loja.email)
  if (contactParts.length) {
    doc.text(contactParts.join("  |  "), textStartX, infoY)
    infoY += 4
  }

  const badgeY = y
  const pageW = getPageWidth(doc)
  const numStr = `ORÇAMENTO ${formatNumeroOrcamento(orcamento.numero)}`

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.primary)
  doc.text(numStr, pageW - MARGIN.right, badgeY + 3, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.gray)
  doc.text(
    `Emissão: ${formatDate(new Date(orcamento.dataEmissao))}`,
    pageW - MARGIN.right,
    badgeY + 10,
    { align: "right" },
  )
  doc.text(
    `Validade: ${formatDate(new Date(orcamento.dataValidade))}`,
    pageW - MARGIN.right,
    badgeY + 14,
    { align: "right" },
  )

  const headerBottom = Math.max(infoY, badgeY + 18)

  doc.setDrawColor(...COLORS.lightGray)
  doc.setLineWidth(0.3)
  doc.line(MARGIN.left, headerBottom, pageW - MARGIN.right, headerBottom)

  return headerBottom + 6
}

function drawClienteSection(doc: jsPDF, cliente: Cliente, y: number): number {
  y = drawSectionTitle(doc, "DADOS DO CLIENTE", y)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.dark)
  doc.text(cliente.nome, MARGIN.left, y)
  y += 5

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.gray)

  doc.text(`CPF/CNPJ: ${formatCpfCnpj(cliente.cpfCnpj)}`, MARGIN.left, y)

  const rightCol = getPageWidth(doc) / 2
  if (cliente.telefone) {
    doc.text(`Tel: ${formatPhone(cliente.telefone)}`, rightCol, y)
  }
  y += 4

  if (cliente.email) {
    doc.text(`E-mail: ${cliente.email}`, MARGIN.left, y)
    y += 4
  }

  const enderecoParts: string[] = []
  if (cliente.logradouro) {
    let addr = cliente.logradouro
    if (cliente.numero) addr += `, ${cliente.numero}`
    if (cliente.complemento) addr += ` - ${cliente.complemento}`
    enderecoParts.push(addr)
  }
  if (cliente.bairro) enderecoParts.push(cliente.bairro)
  if (cliente.cidade && cliente.estado) {
    enderecoParts.push(`${cliente.cidade}/${cliente.estado}`)
  }
  if (cliente.cep) enderecoParts.push(`CEP: ${formatCep(cliente.cep)}`)

  if (enderecoParts.length) {
    doc.text(enderecoParts.join("  -  "), MARGIN.left, y)
    y += 4
  }

  return y + 4
}

function drawItensTable(
  doc: jsPDF,
  itens: DadosPdf["itens"],
  y: number,
): number {
  y = drawSectionTitle(doc, "PRODUTOS / SERVIÇOS", y)

  const body = itens.map((item, idx) => [
    String(idx + 1),
    item.produto.nome,
    String(item.quantidade),
    formatCurrency(item.precoUnitario),
    formatCurrency(item.subtotal),
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN.left, right: MARGIN.right },
    head: [["#", "Produto", "Qtd", "Preço Unit.", "Subtotal"]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.tableHead,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.dark,
    },
    alternateRowStyles: {
      fillColor: COLORS.tableStripe,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { halign: "left" },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "right", cellWidth: 32 },
      4: { halign: "right", cellWidth: 32 },
    },
    styles: {
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      cellPadding: 3,
    },
  })

  const table = (doc as unknown as { lastAutoTable: { finalY: number } })
    .lastAutoTable
  return (table?.finalY ?? y + 20) + 6
}

function drawResumoFinanceiro(
  doc: jsPDF,
  orcamento: Orcamento,
  y: number,
): number {
  y = ensureSpace(doc, y, 40)

  const pageW = getPageWidth(doc)
  const boxW = 80
  const boxX = pageW - MARGIN.right - boxW

  doc.setFillColor(...COLORS.lightGray)
  const boxH =
    orcamento.descontoValor > 0 || orcamento.descontoPercentual > 0 ? 32 : 22
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, "F")

  let lineY = y + 7
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.gray)
  doc.text("Subtotal:", boxX + 4, lineY)
  doc.setTextColor(...COLORS.dark)
  doc.text(formatCurrency(orcamento.subtotal), boxX + boxW - 4, lineY, {
    align: "right",
  })

  if (orcamento.descontoValor > 0 || orcamento.descontoPercentual > 0) {
    lineY += 8
    doc.setTextColor(192, 57, 43)
    const descontoLabel =
      orcamento.descontoPercentual > 0
        ? `Desconto (${orcamento.descontoPercentual}%):`
        : "Desconto:"
    doc.text(descontoLabel, boxX + 4, lineY)
    doc.text(
      `- ${formatCurrency(orcamento.descontoValor)}`,
      boxX + boxW - 4,
      lineY,
      { align: "right" },
    )
  }

  lineY += 3
  doc.setDrawColor(...COLORS.gray)
  doc.setLineWidth(0.2)
  doc.line(boxX + 4, lineY, boxX + boxW - 4, lineY)

  lineY += 7
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.dark)
  doc.text("Total:", boxX + 4, lineY)
  doc.text(formatCurrency(orcamento.total), boxX + boxW - 4, lineY, {
    align: "right",
  })

  return y + boxH + 8
}

function drawCondicoesPagamento(
  doc: jsPDF,
  condicoes: CondicaoPagamento[],
  y: number,
): number {
  y = ensureSpace(doc, y, 30)
  y = drawSectionTitle(doc, "CONDIÇÕES DE PAGAMENTO", y)

  const body = condicoes.map((cond) => {
    const forma = FORMA_PAGAMENTO_LABELS[cond.formaPagamento] ?? cond.formaPagamento
    const parcelaStr =
      cond.parcelas === 1
        ? "À vista"
        : `${cond.parcelas}x de ${formatCurrency(cond.valorParcela)}`
    const desconto =
      cond.descontoPercentual > 0 ? `${cond.descontoPercentual}%` : "-"
    return [forma, parcelaStr, desconto, formatCurrency(cond.valorTotal)]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN.left, right: MARGIN.right },
    head: [["Forma de Pagamento", "Parcelas", "Desconto", "Valor Total"]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.tableHead,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.dark,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left" },
      3: { halign: "right", fontStyle: "bold" },
    },
    styles: {
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      cellPadding: 3,
    },
  })

  const table = (doc as unknown as { lastAutoTable: { finalY: number } })
    .lastAutoTable
  return (table?.finalY ?? y + 20) + 6
}

function drawObservacoes(
  doc: jsPDF,
  observacoes: string,
  y: number,
): number {
  y = ensureSpace(doc, y, 25)
  y = drawSectionTitle(doc, "OBSERVAÇÕES", y)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.dark)

  const maxW = getContentWidth(doc)
  const lines = doc.splitTextToSize(observacoes, maxW) as string[]
  doc.text(lines, MARGIN.left, y)

  return y + lines.length * 4.5 + 6
}

function drawFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageH = getPageHeight(doc)
    const pageW = getPageWidth(doc)

    doc.setDrawColor(...COLORS.lightGray)
    doc.setLineWidth(0.3)
    doc.line(MARGIN.left, pageH - 15, pageW - MARGIN.right, pageH - 15)

    doc.setFont("helvetica", "italic")
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.gray)
    doc.text(
      "Este orçamento é válido pelo período indicado acima. Valores sujeitos a alteração após o vencimento.",
      MARGIN.left,
      pageH - 10,
    )
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageW - MARGIN.right,
      pageH - 10,
      { align: "right" },
    )
  }
}

export async function gerarPdfOrcamento(dados: DadosPdf): Promise<void> {
  const { loja, cliente, orcamento, itens, condicoes } = dados

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  let y = drawHeader(doc, loja, orcamento)
  y = drawClienteSection(doc, cliente, y)
  y = drawItensTable(doc, itens, y)
  y = drawResumoFinanceiro(doc, orcamento, y)
  y = drawCondicoesPagamento(doc, condicoes, y)

  if (orcamento.observacoes) {
    y = drawObservacoes(doc, orcamento.observacoes, y)
  }

  drawFooter(doc)

  doc.save(`orcamento_${String(orcamento.numero).padStart(3, "0")}.pdf`)
}
