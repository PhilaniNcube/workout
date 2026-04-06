import React from "react"
import { PublicHeader } from "@/components/public-header"

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
    </div>
  )
}

export default PublicLayout