import { Geist, JetBrains_Mono } from "next/font/google"
import { Suspense } from "react"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { ConvexClientProvider } from "./ConvexClientProvider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getToken } from "@/lib/auth-server"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

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
          {children}
        </ConvexClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
