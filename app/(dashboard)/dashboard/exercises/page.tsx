import AddExercise from "@/components/exercises/add-exercise"
import ExercisesList from "@/components/exercises/exercises-list"


const Exercises = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full items-start justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Exercises</h1>
        <AddExercise />
      </div>
      <ExercisesList />
    </div>
  )
}

export default Exercises
