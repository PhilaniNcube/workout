"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  format,
  isToday,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import SessionCard from "@/components/workouts/session-card"

export default function SessionsCalendar() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const sessions = useQuery(api.workoutSessions.listByDateRange, {
    startTime: weekStart.getTime(),
    endTime: weekEnd.getTime(),
  })

  const sessionsByDay = useMemo(() => {
    if (!sessions) return new Map<string, typeof sessions>()
    const map = new Map<string, typeof sessions>()
    for (const session of sessions) {
      const key = format(new Date(session.startedAt), "yyyy-MM-dd")
      const existing = map.get(key) ?? []
      existing.push(session)
      map.set(key, existing)
    }
    return map
  }, [sessions])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((prev) => subWeeks(prev, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((prev) => addWeeks(prev, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {sessions === undefined ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const daySessions = sessionsByDay.get(key) ?? []
            const today = isToday(day)

            return (
              <Card
                key={key}
                className={cn(
                  "min-h-32",
                  today && "border-primary bg-primary/5 border-2",
                )}
              >
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-medium">
                    <span
                      className={cn(
                        "block text-muted-foreground",
                        today && "text-primary font-semibold",
                      )}
                    >
                      {format(day, "EEE")}
                    </span>
                    <span
                      className={cn(
                        today &&
                          "bg-primary text-primary-foreground inline-flex h-5 w-5 items-center justify-center rounded-full",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {daySessions.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      No sessions
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {daySessions.map((session) => (
                        <SessionCard key={session._id} session={session} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}