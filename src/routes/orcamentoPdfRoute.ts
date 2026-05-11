import type { FastifyInstance, FastifyPluginCallback } from "fastify";
import { OrcamentoSchema } from "../types/orcamento";
import { gerarPdfOrcamento } from "../pdf/orcamentoPdf";

export const orcamentoPdfRoute: FastifyPluginCallback = (
  fastify: FastifyInstance,
  _opts,
  done
) => {
  fastify.post<{
    Params: { id: string };
    Body: unknown;
  }>("/orcamentos/:id/pdf", async (request, reply) => {
    const { id } = request.params;

    const parseResult = OrcamentoSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid payload",
        issues: parseResult.error.issues
      });
    }

    const orcamento = parseResult.data;

    if (orcamento.id !== id) {
      return reply.status(400).send({
        error: "Payload id mismatch",
        message: "ID na URL difere do ID no corpo do orçamento."
      });
    }

    const pdfBytes = await gerarPdfOrcamento(orcamento);

    reply
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `inline; filename="orcamento_${orcamento.numero ?? orcamento.id}.pdf"`
      )
      .send(Buffer.from(pdfBytes));
  });

  done();
};

