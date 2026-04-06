"use client"

import * as React from "react"
import {
  IconBarbell,
  IconDashboard,
  IconHeartRateMonitor,
  IconInnerShadowTop,
  IconMedal,
  IconTargetArrow,
  IconTimeline,
} from "@tabler/icons-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

const signedInRoutes = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: IconDashboard,
  },
  {
    title: "Workout Sessions",
    href: "/dashboard/workout-sessions",
    icon: IconTimeline,
  },
  {
    title: "Exercises",
    href: "/dashboard/exercises",
    icon: IconBarbell,
  },
  {
    title: "Goals",
    href: "/dashboard/goals",
    icon: IconTargetArrow,
  },
  {
    title: "Personal Records",
    href: "/dashboard/personal-records",
    icon: IconMedal,
  },
  {
    title: "Body Metrics",
    href: "/dashboard/body-metrics",
    icon: IconHeartRateMonitor,
  },
] as const

export const AppSidebar = ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">Workout Hub</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your Training</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {signedInRoutes.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
