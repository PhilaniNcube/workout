import AddSession from "@/components/workouts/add-session"
import SessionsCalendar from "@/components/workouts/sessions-calendar"
import TemplateList from "@/components/workouts/template-list"
import ExportCsvButton from "@/components/workouts/export-csv-button"
import { Separator } from "@/components/ui/separator"
import React from "react"

const WorkoutSessions = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Workout Sessions</h1>

        </div>

        <div className="flex items-center gap-2">
          {/* <ExportCsvButton /> */}
          <AddSession />
        </div>

      </div>
      <p className="text-sm text-muted-foreground">
        Track and review your workouts
      </p>
      <TemplateList />
      <Separator />
      <SessionsCalendar />
    </div>
  )
}

export default WorkoutSessions
