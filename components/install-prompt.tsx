"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Download, Share2, PlusSquare } from "lucide-react"

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as unknown as { MSStream?: unknown }).MSStream
    )
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)

    const standaloneHandler = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches)
    }
    const mql = window.matchMedia("(display-mode: standalone)")
    mql.addEventListener("change", standaloneHandler)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      mql.removeEventListener("change", standaloneHandler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (result.outcome === "accepted") {
      setDismissed(true)
    }
  }

  if (isStandalone || dismissed) return null

  if (!isIOS && !deferredPrompt) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-screen-md items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {isIOS ? (
              <>
                Tap <Share2 className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
                then <strong>Add to Home Screen</strong>{" "}
                <PlusSquare className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
                to install this app
              </>
            ) : (
              "Install this app on your home screen for quick access"
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!isIOS && (
            <Button size="sm" onClick={handleInstall}>
              Install
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}
