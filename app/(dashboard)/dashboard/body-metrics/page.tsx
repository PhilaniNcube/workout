"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const logSchema = z.object({
  recordedAt: z.string().optional(),
  bodyWeight: z.string().optional(),
  bodyFatPercent: z.string().optional(),
  waistCm: z.string().optional(),
  chestCm: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});

type LogFormValues = z.infer<typeof logSchema>;

function TrendBar({
  label,
  current,
  previous,
  unit,
  inverted = false,
}: {
  label: string;
  current: number | null;
  previous: number | null;
  unit: string;
  inverted?: boolean;
}) {
  if (!current || !previous) return null;
  const diff = current - previous;
  const isUp = diff > 0;
  const isGood = inverted ? !isUp : isUp;
  const pctChange = ((Math.abs(diff) / previous) * 100).toFixed(1);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground w-16">{label}:</span>
      <span className="font-medium">
        {current} {unit}
      </span>
      <span
        className={`flex items-center gap-0.5 text-xs ${
          isGood ? "text-green-600" : "text-red-500"
        }`}
      >
        {isUp ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {pctChange}%
      </span>
    </div>
  );
}

export default function BodyMetricsPage() {
  const metrics = useQuery(api.bodyMetrics.list, { limit: 50 });
  const deleteMetric = useMutation(api.bodyMetrics.remove);

  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      recordedAt: "",
      bodyWeight: "",
      bodyFatPercent: "",
      waistCm: "",
      chestCm: "",
      notes: "",
    },
  });

  const onSubmit = async (data: LogFormValues) => {
    const formData = new FormData();
    if (data.recordedAt) formData.set("recordedAt", String(new Date(data.recordedAt).getTime()));
    if (data.bodyWeight) formData.set("bodyWeight", data.bodyWeight);
    if (data.bodyFatPercent) formData.set("bodyFatPercent", data.bodyFatPercent);
    if (data.waistCm) formData.set("waistCm", data.waistCm);
    if (data.chestCm) formData.set("chestCm", data.chestCm);
    if (data.notes) formData.set("notes", data.notes);

    const { logBodyMetricAction } = await import("@/actions/body-metrics");
    const result = await logBodyMetricAction(formData);
    if (result.success) {
      reset();
      setOpen(false);
    }
  };

  const sortedMetrics = metrics
    ? [...metrics].sort((a, b) => b.recordedAt - a.recordedAt)
    : undefined;

  const latest = sortedMetrics?.[0] ?? null;
  const previous = sortedMetrics?.[1] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full items-start justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Body Metrics</h1>
        <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Log Metric
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Body Metric</DialogTitle>
              <DialogDescription>
                Record your current body measurements and weight.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <FieldGroup className="space-y-3">
                <Field>
                  <FieldLabel htmlFor="bm-date">Date</FieldLabel>
                  <Input
                    id="bm-date"
                    type="datetime-local"
                    {...register("recordedAt")}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="bm-weight">Body Weight (kg)</FieldLabel>
                    <Input
                      id="bm-weight"
                      type="number"
                      step="0.1"
                      min={0}
                      placeholder="e.g. 75.5"
                      {...register("bodyWeight")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="bm-fat">Body Fat %</FieldLabel>
                    <Input
                      id="bm-fat"
                      type="number"
                      step="0.1"
                      min={0}
                      max={60}
                      placeholder="e.g. 15.0"
                      {...register("bodyFatPercent")}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="bm-waist">Waist (cm)</FieldLabel>
                    <Input
                      id="bm-waist"
                      type="number"
                      step="0.1"
                      min={0}
                      placeholder="e.g. 80"
                      {...register("waistCm")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="bm-chest">Chest (cm)</FieldLabel>
                    <Input
                      id="bm-chest"
                      type="number"
                      step="0.1"
                      min={0}
                      placeholder="e.g. 100"
                      {...register("chestCm")}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="bm-notes">Notes</FieldLabel>
                  <Input
                    id="bm-notes"
                    placeholder="Optional notes..."
                    {...register("notes")}
                  />
                </Field>
                {Object.keys(errors).length > 0 && (
                  <FieldError>Please fix the errors above.</FieldError>
                )}
              </FieldGroup>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {latest && previous && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Latest Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <TrendBar
                label="Weight"
                current={latest.bodyWeight ?? null}
                previous={previous.bodyWeight ?? null}
                unit="kg"
                inverted
              />
              <TrendBar
                label="Body Fat"
                current={latest.bodyFatPercent ?? null}
                previous={previous.bodyFatPercent ?? null}
                unit="%"
                inverted
              />
              <TrendBar
                label="Waist"
                current={latest.waistCm ?? null}
                previous={previous.waistCm ?? null}
                unit="cm"
                inverted
              />
              <TrendBar
                label="Chest"
                current={latest.chestCm ?? null}
                previous={previous.chestCm ?? null}
                unit="cm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Measurement History</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sortedMetrics && sortedMetrics.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No measurements recorded yet. Log your first body metric to start tracking.
            </p>
          ) : (
            sortedMetrics && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Weight (kg)</th>
                    <th className="py-2 pr-3">BF%</th>
                    <th className="py-2 pr-3">Waist (cm)</th>
                    <th className="py-2 pr-3">Chest (cm)</th>
                    <th className="py-2 pr-3">Notes</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMetrics.map((m) => (
                    <tr key={m._id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {format(new Date(m.recordedAt), "MMM d, yyyy")}
                      </td>
                      <td className="py-2 pr-3">
                        {m.bodyWeight != null ? m.bodyWeight : "–"}
                      </td>
                      <td className="py-2 pr-3">
                        {m.bodyFatPercent != null ? `${m.bodyFatPercent}%` : "–"}
                      </td>
                      <td className="py-2 pr-3">
                        {m.waistCm != null ? m.waistCm : "–"}
                      </td>
                      <td className="py-2 pr-3">
                        {m.chestCm != null ? m.chestCm : "–"}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground max-w-40 truncate">
                        {m.notes ?? "–"}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
                          onClick={() => deleteMetric({ metricId: m._id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
