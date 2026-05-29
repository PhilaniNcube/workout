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

const isConvexId = (segment: string) => {
  // Convex IDs are typically alphanumeric, length between 15 and 30, and do not contain special characters.
  return /^[a-zA-Z0-9]{15,30}$/.test(segment)
}

const getTitleForId = (parentSegment: string) => {
  switch (parentSegment) {
    case "workout-sessions":
      return "Session Details"
    case "exercises":
      return "Exercise Details"
    case "muscle-groups":
      return "Muscle Group Details"
    default:
      if (!parentSegment) return "Details"
      // Singularize typical plural parent paths
      const cleanParent = parentSegment.replace(/s$/, "")
      return `${formatSegmentAsTitle(cleanParent)} Details`
  }
}

const PageTitle = () => {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const titleSegment = segments[segments.length - 1]
  const parentSegment = segments[segments.length - 2]

  let title = "Home"
  if (titleSegment) {
    const decodedSegment = decodeURIComponent(titleSegment)
    if (isConvexId(decodedSegment)) {
      title = getTitleForId(parentSegment)
    } else {
      title = formatSegmentAsTitle(decodedSegment)
    }
  }

  return (
    <h1 
      className="text-base font-medium truncate max-w-[150px] sm:max-w-[280px] md:max-w-[400px] lg:max-w-none"
      title={title}
    >
      {title}
    </h1>
  )
}

export default PageTitle

