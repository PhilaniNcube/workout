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

export default function HeartRateChart() {
  const readings = useQuery(api.heartRate.list, { limit: 200 })

  if (readings === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resting Heart Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (readings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resting Heart Rate</CardTitle>
          <CardDescription>
            Track your resting heart rate over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No heart rate readings recorded yet. Sync Google Health or log
            manually to see your trends.
          </p>
        </CardContent>
      </Card>
    )
  }

  const trendData = readings
    .map((r) => ({
      date: new Date(r.recordedAt).toISOString().slice(0, 10),
      bpm: r.bpm,
    }))
    .reverse()

  const latestBpm = readings[0].bpm
  const oldestBpm = readings[readings.length - 1].bpm
  const bpmDelta = readings.length >= 2 ? latestBpm - oldestBpm : null

  const chartConfig = {
    bpm: { label: "BPM", color: "var(--chart-4)" },
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Resting Heart Rate</CardTitle>
            <CardDescription>
              {readings.length} reading{readings.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          {bpmDelta != null && (
            <div
              className={`text-sm font-medium tabular-nums ${
                bpmDelta < 0
                  ? "text-emerald-500"
                  : bpmDelta > 0
                    ? "text-amber-500"
                    : "text-muted-foreground"
              }`}
            >
              {bpmDelta > 0 ? "+" : ""}
              {bpmDelta} bpm
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-[2.5/1] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
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
                domain={["auto", "auto"]}
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
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: "var(--color-bpm)" }}
                        />
                        <span className="text-muted-foreground">BPM</span>
                        <span className="ml-auto font-medium text-foreground tabular-nums">
                          {Number(payload[0].value).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="bpm"
                name="BPM"
                stroke="var(--color-bpm)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
