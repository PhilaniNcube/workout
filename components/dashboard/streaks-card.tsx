"use client";

import { useQuery } from "convex/react";
import { Flame, Calendar, Trophy, Dumbbell } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StreaksCard() {
  const stats = useQuery(api.stats.getStreaks, {});

  if (stats === undefined) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = [
    {
      label: "Current Streak",
      value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`,
      icon: Flame,
      color: "text-orange-500",
    },
    {
      label: "Longest Streak",
      value: `${stats.longestStreak} day${stats.longestStreak !== 1 ? "s" : ""}`,
      icon: Trophy,
      color: "text-amber-500",
    },
    {
      label: "This Week",
      value: `${stats.workoutsThisWeek} workout${stats.workoutsThisWeek !== 1 ? "s" : ""}`,
      icon: Calendar,
      color: "text-blue-500",
    },
    {
      label: "Total Workouts",
      value: String(stats.totalWorkouts),
      icon: Dumbbell,
      color: "text-emerald-500",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center rounded-md border p-3 text-center"
            >
              <item.icon className={`mb-1 h-5 w-5 ${item.color}`} />
              <span className="text-xl font-bold tabular-nums">
                {item.value.split(" ")[0]}
              </span>
              <span className="text-muted-foreground text-[10px] uppercase">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
