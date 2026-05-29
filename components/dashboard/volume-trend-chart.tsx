"use client"

import { useQuery } from "convex/react"
import { format } from "date-fns"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import {
  AreaChart,
  Area,
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
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

export default function VolumeTrendChart() {
  const data = useQuery(api.stats.getProgressionCharts, { weeks: 8 })

  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Volume Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const { volumeTrend } = data
  const hasData = volumeTrend.some((w) => w.volume > 0)

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Volume Trend</CardTitle>
          <CardDescription>Weekly total volume over {data.weeks} weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            No volume data yet. Log sets with weight × reps to see your trend.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calculate trend vs previous week
  const lastTwo = volumeTrend.filter((w) => w.volume > 0).slice(-2)
  const trendPct =
    lastTwo.length === 2 && lastTwo[0].volume > 0
      ? ((lastTwo[1].volume - lastTwo[0].volume) / lastTwo[0].volume) * 100
      : null

  const TrendIcon =
    trendPct != null
      ? trendPct > 0
        ? TrendingUp
        : trendPct < 0
          ? TrendingDown
          : Minus
      : null

  const chartConfig = {
    volume: { label: "Volume (kg)", color: "var(--chart-1)" },
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Volume Trend</CardTitle>
            <CardDescription>
              Weekly total volume over {data.weeks} weeks
            </CardDescription>
          </div>
          {trendPct != null && TrendIcon && (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                trendPct > 0
                  ? "text-emerald-500"
                  : trendPct < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
              }`}
            >
              <TrendIcon className="h-4 w-4" />
              {trendPct > 0 ? "+" : ""}
              {trendPct.toFixed(1)}%
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={volumeTrend}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-volume)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-volume)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
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
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
                width={45}
              />
              <Tooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) =>
                      `Week of ${format(new Date(label), "MMM d")}`
                    }
                    valueFormatter={(v) => `${v.toLocaleString()} kg`}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="volume"
                name="Volume (kg)"
                stroke="var(--color-volume)"
                strokeWidth={2}
                fill="url(#volumeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
