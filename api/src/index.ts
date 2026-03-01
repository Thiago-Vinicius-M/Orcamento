import express from "express"
import cors from "cors"
import lojaRoutes from "./routes/loja.js"
import clienteRoutes from "./routes/clientes.js"
import produtoRoutes from "./routes/produtos.js"
import orcamentoRoutes from "./routes/orcamentos.js"
import dashboardRoutes from "./routes/dashboard.js"

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json({ limit: "10mb" }))

app.use("/api/loja", lojaRoutes)
app.use("/api/clientes", clienteRoutes)
app.use("/api/produtos", produtoRoutes)
app.use("/api/orcamentos", orcamentoRoutes)
app.use("/api/dashboard", dashboardRoutes)

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err)
    res.status(500).json({ error: "Erro interno do servidor" })
  },
)

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`)
})
