import AddSession from "@/components/workouts/add-session"
import SessionsCalendar from "@/components/workouts/sessions-calendar"
import { Separator } from "@/components/ui/separator"
import React from "react"

const WorkoutSessions = () => {
  return (
    <div>
      {/* Workout Sessions Header */}
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Workout Sessions</h1>
        <AddSession />
      </div>
      <Separator className="my-4" />
      {/* Workout Sessions List */}
      <SessionsCalendar />
    </div>
  )
}

export default WorkoutSessions
