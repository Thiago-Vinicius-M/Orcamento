import nodemailer from "nodemailer"

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, NODE_ENV } = process.env

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  }

  return transporter
}

export async function sendConfirmationEmail(email: string, link: string) {
  const from = EMAIL_FROM
  const transport = getTransporter()

  if (!from || !transport) {
    if (NODE_ENV !== "production") {
      console.warn(
        "[email] SMTP/EMAIL_FROM não configurados. Link de confirmação gerado (apenas log):",
        { email, link },
      )
      return
    }

    throw new Error(
      "Configuração de e-mail incompleta. Defina EMAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS.",
    )
  }

  await transport.sendMail({
    from,
    to: email,
    subject: "Confirme seu cadastro e defina sua senha",
    text: [
      "Olá,",
      "",
      "Para ativar sua conta, clique no link abaixo e defina sua senha:",
      link,
      "",
      "Se você não solicitou este cadastro, ignore este e-mail.",
    ].join("\n"),
    html: `
      <p>Olá,</p>
      <p>Para ativar sua conta, clique no link abaixo e defina sua senha:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Se você não solicitou este cadastro, pode ignorar este e-mail.</p>
    `,
  })
}

