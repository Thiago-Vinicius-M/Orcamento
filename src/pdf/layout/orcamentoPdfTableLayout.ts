export type OrcamentoPdfTableLayoutCols = {
  contentW: number;
  colServW: number;
  colDescW: number;
  colValorW: number;
  xServ: number;
  xDesc: number;
  xValor: number;
};

export function computeOrcamentoPdfTableLayout(pageWidth: number, margin: number): OrcamentoPdfTableLayoutCols {
  const contentW = pageWidth - 2 * margin;
  const colValorW = 90;
  const colServW = 130;
  const colDescW = contentW - colServW - colValorW;
  return {
    contentW,
    colServW,
    colDescW,
    colValorW,
    xServ: margin,
    xDesc: margin + colServW,
    xValor: margin + colServW + colDescW,
  };
}
