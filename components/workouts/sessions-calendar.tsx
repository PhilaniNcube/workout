"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery } from "convex/react"
import {
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  format,
  isToday,
  differenceInMinutes,
} from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Timer,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import SessionCard from "@/components/workouts/session-card"

/** Hours shown on the timeline (6 AM through 11 PM) */
const TIMELINE_HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

export default function SessionsCalendar() {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [now, setNow] = useState(() => new Date())

  // Tick the clock every 60 seconds for the "now" indicator
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const dayStart = startOfDay(selectedDate)
  const dayEnd = endOfDay(selectedDate)
  const isTodaySelected = isToday(selectedDate)

  const sessions = useQuery(api.workoutSessions.listByDateRange, {
    startTime: dayStart.getTime(),
    endTime: dayEnd.getTime(),
  })

  // Group sessions by the hour they started in
  const sessionsByHour = useMemo(() => {
    if (!sessions) return new Map<number, typeof sessions>()
    const map = new Map<number, typeof sessions>()
    for (const session of sessions) {
      const hour = new Date(session.startedAt).getHours()
      const existing = map.get(hour) ?? []
      existing.push(session)
      map.set(hour, existing)
    }
    return map
  }, [sessions])

  // Quick stats
  const stats = useMemo(() => {
    if (!sessions || sessions.length === 0) return null
    let totalMinutes = 0
    for (const s of sessions) {
      if (s.endedAt) {
        totalMinutes += differenceInMinutes(new Date(s.endedAt), new Date(s.startedAt))
      }
    }
    return {
      count: sessions.length,
      totalMinutes,
    }
  }, [sessions])

  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  return (
    <div className="space-y-4">
      {/* Day navigation header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">
            {isTodaySelected
              ? "Today"
              : format(selectedDate, "EEEE")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            className="h-10 w-10 p-0"
            onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            className="h-10"
            onClick={() => setSelectedDate(startOfDay(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            className="h-10 w-10 p-0"
            onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-sm">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{stats.count}</span>
            <span className="text-muted-foreground">
              {stats.count === 1 ? "session" : "sessions"}
            </span>
          </div>
          {stats.totalMinutes > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {stats.totalMinutes >= 60
                  ? `${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`
                  : `${stats.totalMinutes}m`}
              </span>
              <span className="text-muted-foreground">total</span>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {sessions === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
          <Clock className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            No sessions {isTodaySelected ? "today" : "on this day"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {isTodaySelected
              ? "Start a new workout to see it here"
              : "Nothing was logged for this day"}
          </p>
        </div>
      ) : (
        <div className="relative rounded-lg border border-border/60 overflow-hidden">
          {TIMELINE_HOURS.map((hour) => {
            const hourSessions = sessionsByHour.get(hour) ?? []
            const isCurrentHour = isTodaySelected && hour === currentHour
            const hasSession = hourSessions.length > 0
            const isPastHour = isTodaySelected && hour < currentHour

            return (
              <div
                key={hour}
                className={cn(
                  "relative flex border-b border-border/40 last:border-b-0 transition-colors",
                  isCurrentHour && "bg-primary/[0.04]",
                  !hasSession && !isCurrentHour && "hover:bg-muted/20",
                )}
              >
                {/* Hour label gutter */}
                <div
                  className={cn(
                    "flex w-16 shrink-0 items-start justify-end border-r border-border/40 pr-3 pt-2.5 text-xs tabular-nums",
                    isCurrentHour
                      ? "font-semibold text-primary"
                      : isPastHour
                        ? "text-muted-foreground/50"
                        : "text-muted-foreground",
                  )}
                >
                  {format(new Date(2000, 0, 1, hour), "h a")}
                </div>

                {/* Content area */}
                <div
                  className={cn(
                    "flex-1 min-h-[3rem]",
                    hasSession ? "p-2 space-y-1.5" : "p-2",
                  )}
                >
                  {hourSessions.map((session) => (
                    <SessionCard key={session._id} session={session} />
                  ))}
                </div>

                {/* "Now" indicator line */}
                {isCurrentHour && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                    style={{ top: `${(currentMinute / 60) * 100}%` }}
                  >
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary ml-[3.25rem]" />
                    <div className="h-[2px] flex-1 bg-primary" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}