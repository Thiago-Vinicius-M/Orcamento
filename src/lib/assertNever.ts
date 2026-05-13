/** Garante exaustividade em `switch` sobre uniões discriminadas. */
export function assertNever(x: never): never {
  throw new Error(`Valor inesperado: ${String(x)}`)
}
