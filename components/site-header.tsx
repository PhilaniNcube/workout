import { Button } from "@/components/ui/button"
import PageTitle from "@/components/page-title"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Suspense } from "react"
import AuthButtons from "./auth-buttons"
import { IconCircleDashedNumber0 } from "@tabler/icons-react"
import { Input } from "./ui/input"


export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Suspense>
          <PageTitle />
        </Suspense>
        <div className="ml-auto flex items-center gap-2">
          <Input placeholder="Search..." className="hidden md:flex" />  
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
        </div>
      </div>
    </header>
  )
}
