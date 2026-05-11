import Fastify from "fastify";
import cors from "@fastify/cors";
import { orcamentoPdfRoute } from "./routes/orcamentoPdfRoute";

async function buildServer() {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: true
  });

  app.register(orcamentoPdfRoute);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}

export async function start() {
  const app = await buildServer();
  const port = Number(process.env.PORT) || 3333;
  const host = process.env.HOST || "0.0.0.0";

  try {
    await app.listen({ port, host });
    console.log(`PDF backend rodando em http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Inicializa quando rodar via `npm run dev:pdf`
void start();

export { buildServer };

