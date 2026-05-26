import PersonalBestsByMuscleGroupCard from "@/components/dashboard/personal-bests-by-muscle-group-card"
import SuggestedNextExercisesCard from "@/components/dashboard/suggested-next-exercises-card"
import StreaksCard from "@/components/dashboard/streaks-card"
import OverloadAlertsCard from "@/components/dashboard/overload-alerts-card"
import React from "react"

const DashboardPage = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <StreaksCard />
      <OverloadAlertsCard />
      <SuggestedNextExercisesCard />
      <PersonalBestsByMuscleGroupCard />
    </div>
  )
}

export default DashboardPage
