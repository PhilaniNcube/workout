"use client"

import { useQuery } from "convex/react"
import { format } from "date-fns"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CHART_COLORS, ChartContainer } from "@/components/ui/chart"

const LINE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export default function ExerciseProgressionChart() {
  const data = useQuery(api.stats.getProgressionCharts, { weeks: 8 })

  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exercise Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const { exerciseProgression } = data

  if (exerciseProgression.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exercise Progression</CardTitle>
          <CardDescription>
            Max weight per exercise over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            No exercise data yet. Log sets with weight to track progression.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Build unified chart data: one row per unique date, with columns for each exercise
  const dateSet = new Set<string>()
  for (const ex of exerciseProgression) {
    for (const p of ex.points) {
      dateSet.add(p.date)
    }
  }
  const allDates = Array.from(dateSet).sort()

  const chartData = allDates.map((date) => {
    const row: Record<string, unknown> = { date }
    for (const ex of exerciseProgression) {
      const point = ex.points.find((p) => p.date === date)
      row[ex.exerciseName] = point?.maxWeight ?? null
    }
    return row
  })

  const chartConfig = Object.fromEntries(
    exerciseProgression.map((ex, i) => [
      ex.exerciseName,
      { label: ex.exerciseName, color: LINE_COLORS[i % LINE_COLORS.length] },
    ]),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercise Progression</CardTitle>
        <CardDescription>
          Max weight (kg) per session · top {exerciseProgression.length} exercises
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border/50"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => format(new Date(v), "MMM d")}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border bg-background px-3 py-2 shadow-xl">
                      <p className="mb-1 text-xs font-medium text-foreground">
                        {format(new Date(String(label)), "MMM d, yyyy")}
                      </p>
                      <div className="space-y-0.5">
                        {payload
                          .filter((p) => p.value != null)
                          .map((entry, index) => (
                            <div
                              key={`${entry.dataKey}-${index}`}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span
                                className="inline-block h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground truncate max-w-[120px]">
                                {String(entry.name)}
                              </span>
                              <span className="ml-auto font-medium tabular-nums text-foreground">
                                {Number(entry.value)} kg
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              {exerciseProgression.map((ex, i) => (
                <Line
                  key={ex.exerciseId}
                  type="monotone"
                  dataKey={ex.exerciseName}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
