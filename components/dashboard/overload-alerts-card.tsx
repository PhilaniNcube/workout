"use client";

import { useQuery } from "convex/react";
import { AlertTriangle } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OverloadAlertsCard() {
  const alerts = useQuery(api.stats.getOverloadAlerts, { minStaleWeeks: 2 });

  if (alerts === undefined) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progressive Overload</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Progressive Overload Alert</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.exerciseId}
              className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium">
                  {alert.exerciseName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Best weight: {alert.bestWeight} kg — no new PR in{" "}
                  {alert.weeksStale} week{alert.weeksStale !== 1 ? "s" : ""}.
                  Consider increasing weight or reps.
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
