import React, { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SiteHeader } from "@/components/site-header"
import AuthButtons from "@/components/auth-buttons"
import OfflineIndicator from "@/components/offline-indicator"
import { IconCircleDashedNumber0 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="">
        <OfflineIndicator />
        <SiteHeader
          authSlot={
            <Suspense
              fallback={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled
                  aria-label="Loading account"
                >
                  <IconCircleDashedNumber0 className="animate-spin" />
                </Button>
              }
            >
              <AuthButtons />
            </Suspense>
          }
        />
        <main className="flex-1 px-3 py-1.5">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default DashboardLayout
