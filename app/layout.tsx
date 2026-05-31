import { Geist, JetBrains_Mono } from "next/font/google"
import { Suspense } from "react"
import type { Metadata, Viewport } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { ConvexClientProvider } from "./ConvexClientProvider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { OfflineProvider } from "@/components/offline-provider"
import { getToken } from "@/lib/auth-server"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "Workout Tracker",
    template: "%s | Workout Tracker",
  },
  description: "Track your workouts, sets, reps, and progress over time",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Workout",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontSans.variable,
        "font-mono",
        jetbrainsMono.variable
      )}
    >
      <body>
        <Suspense fallback={null}>
          <AuthProvider>{children}</AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}

async function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialToken = await getToken()
  return (
    <ThemeProvider>
      <TooltipProvider>
        <ConvexClientProvider initialToken={initialToken}>
          <OfflineProvider>{children}</OfflineProvider>
        </ConvexClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
