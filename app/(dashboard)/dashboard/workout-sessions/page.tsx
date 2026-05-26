import AddSession from "@/components/workouts/add-session"
import SessionsCalendar from "@/components/workouts/sessions-calendar"
import TemplateList from "@/components/workouts/template-list"
import ExportCsvButton from "@/components/workouts/export-csv-button"
import { Separator } from "@/components/ui/separator"
import React from "react"

const WorkoutSessions = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold">Workout Sessions</h1>
        <div className="flex items-center gap-2">
          <ExportCsvButton />
          <AddSession />
        </div>
      </div>
      <TemplateList />
      <Separator />
      <SessionsCalendar />
    </div>
  )
}

export default WorkoutSessions
