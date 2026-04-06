"use client"

import { usePathname } from "next/navigation"
import React from "react"

const formatSegmentAsTitle = (segment: string) => {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const PageTitle = () => {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const titleSegment = segments[segments.length - 1]

  const title =
    !titleSegment ? "Home" : formatSegmentAsTitle(decodeURIComponent(titleSegment))

  return <h1 className="text-base font-medium">{title}</h1>
}

export default PageTitle
