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
import { ChartContainer } from "@/components/ui/chart"

export default function BodyMetricsChart() {
  const data = useQuery(api.stats.getProgressionCharts, { weeks: 12 })

  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Body Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const { bodyMetricsTrend } = data
  const hasWeight = bodyMetricsTrend.some((m) => m.bodyWeight != null)
  const hasFat = bodyMetricsTrend.some((m) => m.bodyFatPercent != null)

  if (!hasWeight && !hasFat) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Body Metrics</CardTitle>
          <CardDescription>
            Body weight and body fat % over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            No body metrics recorded yet. Log measurements to see your trends.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calculate trend for body weight
  const weightValues = bodyMetricsTrend
    .filter((m) => m.bodyWeight != null)
    .map((m) => m.bodyWeight as number)
  const weightDelta =
    weightValues.length >= 2
      ? weightValues[weightValues.length - 1] - weightValues[0]
      : null

  const chartConfig: Record<string, { label: string; color: string }> = {}
  if (hasWeight) chartConfig.bodyWeight = { label: "Weight (kg)", color: "var(--chart-1)" }
  if (hasFat) chartConfig.bodyFatPercent = { label: "Body Fat (%)", color: "var(--chart-3)" }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Body Metrics</CardTitle>
            <CardDescription>
              Tracking over the last {data.weeks} weeks
            </CardDescription>
          </div>
          {weightDelta != null && (
            <div
              className={`text-sm font-medium tabular-nums ${
                weightDelta < 0
                  ? "text-emerald-500"
                  : weightDelta > 0
                    ? "text-amber-500"
                    : "text-muted-foreground"
              }`}
            >
              {weightDelta > 0 ? "+" : ""}
              {weightDelta.toFixed(1)} kg
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-[2.5/1] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={bodyMetricsTrend}
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
              {hasWeight && (
                <YAxis
                  yAxisId="weight"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `${v}`}
                />
              )}
              {hasFat && (
                <YAxis
                  yAxisId="fat"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `${v}%`}
                />
              )}
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
                          .map((entry, index) => {
                            const isWeight = entry.dataKey === "bodyWeight"
                            return (
                              <div
                                key={`${entry.dataKey}-${index}`}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span
                                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-muted-foreground">
                                  {isWeight ? "Weight" : "Body Fat"}
                                </span>
                                <span className="ml-auto font-medium tabular-nums text-foreground">
                                  {Number(entry.value).toFixed(1)}
                                  {isWeight ? " kg" : "%"}
                                </span>
                              </div>
                            )
                          })}
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
              {hasWeight && (
                <Line
                  yAxisId="weight"
                  type="monotone"
                  dataKey="bodyWeight"
                  name="Weight (kg)"
                  stroke="var(--color-bodyWeight)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              )}
              {hasFat && (
                <Line
                  yAxisId="fat"
                  type="monotone"
                  dataKey="bodyFatPercent"
                  name="Body Fat (%)"
                  stroke="var(--color-bodyFatPercent)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
