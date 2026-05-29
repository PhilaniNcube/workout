"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Chart color palette using CSS variables from the theme
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

export { CHART_COLORS }

type ChartConfig = Record<
  string,
  {
    label: string
    color?: string
    icon?: React.ComponentType
  }
>

export type { ChartConfig }

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  children: React.ReactNode
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  // Inject CSS variables for chart colors
  const style = Object.entries(config).reduce<Record<string, string>>(
    (acc, [key, value], index) => {
      acc[`--color-${key}`] = value.color ?? CHART_COLORS[index % CHART_COLORS.length]
      return acc
    },
    {},
  )

  return (
    <div
      className={cn(
        "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-sector[stroke='#fff']]:stroke-transparent",
        className,
      )}
      style={style as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  )
}

interface ChartTooltipContentProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
    payload: Record<string, unknown>
  }>
  label?: string
  labelFormatter?: (label: string) => string
  valueFormatter?: (value: number) => string
  hideLabel?: boolean
  indicator?: "line" | "dot" | "dashed"
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  hideLabel = false,
  indicator = "dot",
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null

  const formattedLabel = labelFormatter ? labelFormatter(String(label)) : label

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-xl">
      {!hideLabel && formattedLabel && (
        <p className="mb-1 text-xs font-medium text-foreground">
          {formattedLabel}
        </p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, index) => (
          <div
            key={`${entry.dataKey}-${index}`}
            className="flex items-center gap-2 text-xs"
          >
            {indicator === "dot" && (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            )}
            {indicator === "line" && (
              <span
                className="inline-block h-0.5 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            )}
            {indicator === "dashed" && (
              <span
                className="inline-block h-0.5 w-3 shrink-0 rounded-full border-b border-dashed"
                style={{ borderColor: entry.color }}
              />
            )}
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">
              {valueFormatter ? valueFormatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
