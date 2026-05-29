"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Dumbbell,
  Search as SearchIcon,
  Zap,
  Calendar,
  ArrowUpRight,
  X,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import PageTitle from "@/components/page-title"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"
import { Input } from "./ui/input"
import { cn } from "@/lib/utils"

function SearchPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const results = useQuery(
    api.search.search,
    open && query ? { query } : "skip"
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const hasResults =
    results &&
    (results.exercises.length > 0 ||
      results.muscleGroups.length > 0 ||
      results.sessions.length > 0)

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search... (Ctrl+K)"
          className="w-56 cursor-pointer pr-8 pl-8"
          onFocus={() => {
            setOpen(true)
            setQuery("")
          }}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!open) setOpen(true)
          }}
        />
        {open && (
          <kbd className="pointer-events-none absolute top-1/2 right-2 hidden h-5 -translate-y-1/2 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-80 rounded-md border bg-popover shadow-md">
          <div className="p-2">
            {!query.trim() ? (
              <div className="space-y-1 p-1">
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  Type to search exercises, muscle groups, and sessions...
                </p>
                <div className="mt-1 border-t pt-1">
                  <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                    Quick Links
                  </p>
                  {[
                    { label: "Dashboard", href: "/dashboard", icon: Calendar },
                    {
                      label: "Workout Sessions",
                      href: "/dashboard/workout-sessions",
                      icon: Zap,
                    },
                    {
                      label: "Exercises",
                      href: "/dashboard/exercises",
                      icon: Dumbbell,
                    },
                  ].map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      className="flex min-h-11 w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent md:min-h-0"
                      onClick={() => {
                        router.push(item.href)
                        setOpen(false)
                      }}
                    >
                      <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : results === undefined ? (
              <p className="p-2 text-xs text-muted-foreground">Searching...</p>
            ) : !hasResults ? (
              <p className="p-2 text-xs text-muted-foreground">
                No results found.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {results.exercises.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                      Exercises
                    </p>
                    {results.exercises.map((ex) => (
                      <button
                        key={ex._id}
                        type="button"
                        className="flex min-h-11 w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent md:min-h-0"
                        onClick={() => {
                          router.push(`/dashboard/exercises/${ex._id}`)
                          setOpen(false)
                        }}
                      >
                        <Dumbbell className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{ex.name}</span>
                        <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}

                {results.muscleGroups.length > 0 && (
                  <div
                    className={cn(
                      results.exercises.length > 0 && "mt-1 border-t pt-1"
                    )}
                  >
                    <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                      Muscle Groups
                    </p>
                    {results.muscleGroups.map((mg) => (
                      <button
                        key={mg._id}
                        type="button"
                        className="flex min-h-11 w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent md:min-h-0"
                        onClick={() => {
                          router.push(`/dashboard/muscle-groups/${mg._id}`)
                          setOpen(false)
                        }}
                      >
                        <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{mg.name}</span>
                        <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}

                {results.sessions.length > 0 && (
                  <div
                    className={cn(
                      (results.exercises.length > 0 ||
                        results.muscleGroups.length > 0) &&
                        "mt-1 border-t pt-1"
                    )}
                  >
                    <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                      Sessions
                    </p>
                    {results.sessions.map((s) => (
                      <button
                        key={s._id}
                        type="button"
                        className="flex min-h-11 w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent md:min-h-0"
                        onClick={() => {
                          router.push(`/dashboard/workout-sessions`)
                          setOpen(false)
                        }}
                      >
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {format(new Date(s.startedAt), "MMM d, yyyy h:mm a")}
                        </span>
                        {s.notes && (
                          <span className="max-w-24 truncate text-xs text-muted-foreground">
                            {s.notes}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MobileSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const results = useQuery(
    api.search.search,
    open && query ? { query } : "skip"
  )

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const hasResults =
    results &&
    (results.exercises.length > 0 ||
      results.muscleGroups.length > 0 ||
      results.sessions.length > 0)

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <SearchIcon className="size-4" />
      </Button>
    )
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 top-0 z-50 border-b bg-popover p-2 md:hidden"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search..."
            className="pr-2 pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            setOpen(false)
            setQuery("")
          }}
        >
          <X className="size-4" />
        </Button>
      </div>

      {query.trim() && (
        <div className="mt-2 max-h-72 overflow-y-auto rounded-md border">
          {results === undefined ? (
            <p className="p-2 text-xs text-muted-foreground">Searching...</p>
          ) : !hasResults ? (
            <p className="p-2 text-xs text-muted-foreground">
              No results found.
            </p>
          ) : (
            <div className="p-1">
              {results.exercises.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                    Exercises
                  </p>
                  {results.exercises.map((ex) => (
                    <button
                      key={ex._id}
                      type="button"
                      className="flex min-h-11 w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                      onClick={() => {
                        router.push(`/dashboard/exercises/${ex._id}`)
                        setOpen(false)
                        setQuery("")
                      }}
                    >
                      <Dumbbell className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{ex.name}</span>
                      <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {results.muscleGroups.length > 0 && (
                <div
                  className={cn(
                    results.exercises.length > 0 && "mt-1 border-t pt-1"
                  )}
                >
                  <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                    Muscle Groups
                  </p>
                  {results.muscleGroups.map((mg) => (
                    <button
                      key={mg._id}
                      type="button"
                      className="flex min-h-11 w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                      onClick={() => {
                        router.push(`/dashboard/muscle-groups/${mg._id}`)
                        setOpen(false)
                        setQuery("")
                      }}
                    >
                      <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{mg.name}</span>
                      <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {results.sessions.length > 0 && (
                <div
                  className={cn(
                    (results.exercises.length > 0 ||
                      results.muscleGroups.length > 0) &&
                      "mt-1 border-t pt-1"
                  )}
                >
                  <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                    Sessions
                  </p>
                  {results.sessions.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      className="flex min-h-11 w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                      onClick={() => {
                        router.push(`/dashboard/workout-sessions`)
                        setOpen(false)
                        setQuery("")
                      }}
                    >
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {format(new Date(s.startedAt), "MMM d, yyyy h:mm a")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!query.trim() && (
        <div className="mt-2 rounded-md border p-1">
          <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
            Quick Links
          </p>
          {[
            { label: "Dashboard", href: "/dashboard", icon: Calendar },
            {
              label: "Workout Sessions",
              href: "/dashboard/workout-sessions",
              icon: Zap,
            },
            {
              label: "Exercises",
              href: "/dashboard/exercises",
              icon: Dumbbell,
            },
          ].map((item) => (
            <button
              key={item.href}
              type="button"
              className="flex min-h-11 w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              onClick={() => {
                router.push(item.href)
                setOpen(false)
              }}
            >
              <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SiteHeader({ authSlot }: { authSlot?: React.ReactNode }) {
  return (
    <header className="relative flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
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
          <SearchPalette />
          <MobileSearch />
          {authSlot}
        </div>
      </div>
    </header>
  )
}
