import { useRegisterSW } from "virtual:pwa-register/react"

export function PWAReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    },
  })

  function close() {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="fixed bottom-20 right-4 z-100 w-80 rounded-lg border bg-background p-4 shadow-lg md:bottom-4">
      <div className="mb-3">
        {offlineReady ? (
          <p className="text-sm text-foreground">
            Aplicativo pronto para uso offline.
          </p>
        ) : (
          <p className="text-sm text-foreground">
            Nova versão disponível. Atualize para obter as últimas melhorias.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {needRefresh && (
          <button
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={() => updateServiceWorker(true)}
          >
            Atualizar
          </button>
        )}
        <button
          className="rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={close}
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
