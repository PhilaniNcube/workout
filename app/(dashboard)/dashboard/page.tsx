import PersonalBestsByMuscleGroupCard from "@/components/dashboard/personal-bests-by-muscle-group-card"
import SuggestedNextExercisesCard from "@/components/dashboard/suggested-next-exercises-card"
import StreaksCard from "@/components/dashboard/streaks-card"
import OverloadAlertsCard from "@/components/dashboard/overload-alerts-card"
import GoogleHealthCard from "@/components/dashboard/google-health-card"
import WeeklyVolumeCard from "@/components/dashboard/weekly-volume-card"
import MuscleBalanceCard from "@/components/dashboard/muscle-balance-card"
import WeightReferenceCard from "@/components/dashboard/weight-reference-card"
import SessionHistoryCard from "@/components/dashboard/session-history-card"
import VolumeTrendChart from "@/components/dashboard/volume-trend-chart"
import ExerciseProgressionChart from "@/components/dashboard/exercise-progression-chart"
import BodyMetricsChart from "@/components/dashboard/body-metrics-chart"
import MuscleGroups from "@/components/muscle-groups/muscle-groups"
import React from "react"

const DashboardPage = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <StreaksCard />
      <GoogleHealthCard />
      <OverloadAlertsCard />
      <div className="grid gap-4 lg:grid-cols-2">
        <VolumeTrendChart />
        <ExerciseProgressionChart />
      </div>
      <BodyMetricsChart />
      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyVolumeCard />
        <MuscleBalanceCard />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MuscleGroups />
        <WeightReferenceCard />
      </div>
      <SessionHistoryCard />
      <SuggestedNextExercisesCard />
      <PersonalBestsByMuscleGroupCard />
    </div>
  )
}

export default DashboardPage
