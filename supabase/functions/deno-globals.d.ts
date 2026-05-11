// Shim de tipagens para o TypeScript do projeto.
// Em runtime (Supabase Edge Functions) existe `Deno`, mas o TS local não conhece esse global.

declare const Deno: {
  env: {
    get(name: string): string | undefined
  }
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
}

