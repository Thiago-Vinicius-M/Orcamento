/**
 * Caracterização estável: datas e moeda no PDF dependem de TZ e ICU.
 * @see RIS-8 no plano de refatoração.
 */
process.env.TZ = 'America/Sao_Paulo'
