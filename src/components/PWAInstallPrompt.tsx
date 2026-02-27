import { useState, useEffect } from "react"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setDeferredPrompt(null)
    }
  }

  if (!deferredPrompt || dismissed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-100 max-w-80 rounded-lg border bg-background p-4 shadow-lg md:bottom-4 md:right-auto">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Instalar aplicativo
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Instale para acesso rápido e uso offline.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={handleInstall}
            >
              Instalar
            </button>
            <button
              className="rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => setDismissed(true)}
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
