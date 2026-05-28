import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { requireTokenIdentifier } from "./lib/authz"

const nullableString = v.optional(v.union(v.null(), v.string()))
const nullableMuscleGroupId = v.optional(
  v.union(v.null(), v.id("muscleGroups"))
)
const nullableStorageId = v.optional(v.union(v.null(), v.id("_storage")))

export const list = query({
  args: {
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireTokenIdentifier(ctx)
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100)

    if (args.includeArchived) {
      return await ctx.db.query("exercises").withIndex("by_name").take(limit)
    }

    return await ctx.db
      .query("exercises")
      .withIndex("by_isArchived", (q) => q.eq("isArchived", false))
      .take(limit)
  },
})

export const get = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, args) => {
    await requireTokenIdentifier(ctx)
    const exercise = await ctx.db.get(args.exerciseId)
    if (!exercise) {
      return null
    }
    const photoUrl = exercise.photoStorageId
      ? await ctx.storage.getUrl(exercise.photoStorageId)
      : null
    return { ...exercise, photoUrl }
  },
})

export const generatePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireTokenIdentifier(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    muscleGroup: nullableMuscleGroupId,
    equipment: nullableString,
    exerciseType: v.string(),
    machineNotes: nullableString,
    setupNotes: nullableString,
    photoStorageId: nullableStorageId,
    isCompound: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireTokenIdentifier(ctx)
    const now = Date.now()
    return await ctx.db.insert("exercises", {
      name: args.name,
      muscleGroup: args.muscleGroup ?? null,
      equipment: args.equipment ?? null,
      exerciseType: args.exerciseType,
      isArchived: false,
      machineNotes: args.machineNotes ?? null,
      setupNotes: args.setupNotes ?? null,
      photoStorageId: args.photoStorageId ?? null,
      isCompound: args.isCompound ?? false,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    exerciseId: v.id("exercises"),
    name: v.optional(v.string()),
    muscleGroup: nullableMuscleGroupId,
    equipment: nullableString,
    exerciseType: v.optional(v.string()),
    photoStorageId: nullableStorageId,
    machineNotes: nullableString,
    setupNotes: nullableString,
    isCompound: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireTokenIdentifier(ctx)
    const exercise = await ctx.db.get(args.exerciseId)
    if (!exercise) {
      throw new Error("Exercise not found")
    }

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (args.name !== undefined) patch.name = args.name
    if (args.muscleGroup !== undefined) patch.muscleGroup = args.muscleGroup
    if (args.equipment !== undefined) patch.equipment = args.equipment
    if (args.exerciseType !== undefined) patch.exerciseType = args.exerciseType
    if (args.photoStorageId !== undefined)
      patch.photoStorageId = args.photoStorageId
    if (args.machineNotes !== undefined) patch.machineNotes = args.machineNotes
    if (args.setupNotes !== undefined) patch.setupNotes = args.setupNotes
    if (args.isCompound !== undefined) patch.isCompound = args.isCompound

    await ctx.db.patch(args.exerciseId, patch)
    return args.exerciseId
  },
})

export const archive = mutation({
  args: {
    exerciseId: v.id("exercises"),
    isArchived: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireTokenIdentifier(ctx)
    const exercise = await ctx.db.get(args.exerciseId)
    if (!exercise) {
      throw new Error("Exercise not found")
    }
    await ctx.db.patch(args.exerciseId, {
      isArchived: args.isArchived,
      updatedAt: Date.now(),
    })
    return args.exerciseId
  },
})

export const getHistory = query({
  args: {
    exerciseId: v.id("exercises"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    const limit = Math.min(Math.max(args.limit ?? 30, 1), 100)

    const sessionExerciseRows = await ctx.db
      .query("workoutSessionExercises")
      .withIndex("by_ownerTokenIdentifier_and_exerciseId", (q) =>
        q
          .eq("ownerTokenIdentifier", tokenIdentifier)
          .eq("exerciseId", args.exerciseId)
      )
      .order("desc")
      .take(limit)

    const results: {
      sessionExercise: Doc<"workoutSessionExercises">
      session: Doc<"workoutSessions">
      sets: Doc<"sets">[]
    }[] = []

    for (const se of sessionExerciseRows) {
      const session = await ctx.db.get(se.workoutSessionId)
      if (!session) continue

      const sets = await ctx.db
        .query("sets")
        .withIndex(
          "by_ownerTokenIdentifier_and_workoutSessionExerciseId",
          (q) =>
            q
              .eq("ownerTokenIdentifier", tokenIdentifier)
              .eq("workoutSessionExerciseId", se._id)
        )
        .take(50)

      results.push({
        sessionExercise: se,
        session,
        sets,
      })
    }

    return results
  },
})

export const getLastUsedWeights = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100)

    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_isArchived", (q) => q.eq("isArchived", false))
      .take(200)

    const results: {
      exerciseId: Id<"exercises">
      exerciseName: string
      exerciseType: string
      muscleGroupName: string | null
      equipment: string | null
      lastWeight: number | null
      lastReps: number | null
      lastDurationSeconds: number | null
      lastDistance: number | null
      lastDate: number | null
    }[] = []

    for (const exercise of exercises) {
      const sessionExercises = await ctx.db
        .query("workoutSessionExercises")
        .withIndex("by_ownerTokenIdentifier_and_exerciseId", (q) =>
          q
            .eq("ownerTokenIdentifier", tokenIdentifier)
            .eq("exerciseId", exercise._id)
        )
        .order("desc")
        .take(1)

      if (sessionExercises.length === 0) continue

      const se = sessionExercises[0]
      const session = await ctx.db.get(se.workoutSessionId)
      if (!session) continue

      const sets = await ctx.db
        .query("sets")
        .withIndex(
          "by_ownerTokenIdentifier_and_workoutSessionExerciseId",
          (q) =>
            q
              .eq("ownerTokenIdentifier", tokenIdentifier)
              .eq("workoutSessionExerciseId", se._id)
        )
        .order("desc")
        .take(1)

      if (sets.length === 0) continue

      const lastSet = sets[0]
      const hasStrengthData = lastSet.weight != null
      const hasCardioData =
        lastSet.durationSeconds != null || lastSet.distance != null

      if (!hasStrengthData && !hasCardioData) continue

      let muscleGroupName: string | null = null
      if (exercise.muscleGroup) {
        const mg = await ctx.db.get(exercise.muscleGroup)
        muscleGroupName = mg?.name ?? null
      }

      results.push({
        exerciseId: exercise._id,
        exerciseName: exercise.name,
        exerciseType: exercise.exerciseType ?? "strength",
        muscleGroupName,
        equipment: exercise.equipment ?? null,
        lastWeight: lastSet.weight ?? null,
        lastReps: lastSet.reps ?? null,
        lastDurationSeconds: lastSet.durationSeconds ?? null,
        lastDistance: lastSet.distance ?? null,
        lastDate: session.startedAt,
      })
    }

    results.sort((a, b) => (b.lastDate ?? 0) - (a.lastDate ?? 0))
    return results.slice(0, limit)
  },
})

const COMPOUND_KEYWORDS = [
  "bench press",
  "squat",
  "deadlift",
  "pull up",
  "pull-up",
  "pullup",
  "chin up",
  "chin-up",
  "chinup",
  "overhead press",
  "military press",
  "barbell row",
  "bent over row",
  "bent-over row",
  "t-bar row",
  "pendlay row",
  "dip",
  "lunge",
  "bulgarian split squat",
  "leg press",
  "clean",
  "snatch",
  "push press",
  "push jerk",
  "thruster",
  "romanian deadlift",
  "rdl",
  "stiff leg deadlift",
  "good morning",
  "upright row",
]

export const populateCompounds = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireTokenIdentifier(ctx)
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 500)
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_isArchived", (q) => q.eq("isArchived", false))
      .take(limit)

    let updated = 0
    let skipped = 0
    for (const exercise of exercises) {
      const lower = exercise.name.toLowerCase().trim()
      const isCompound = COMPOUND_KEYWORDS.some((kw) => lower.includes(kw))

      if (isCompound) {
        await ctx.db.patch(exercise._id, {
          isCompound: true,
          updatedAt: Date.now(),
        })
        updated += 1
      } else {
        skipped += 1
      }
    }

    return {
      processed: exercises.length,
      updated,
      skipped,
      hasMore: exercises.length === limit,
    }
  },
})
