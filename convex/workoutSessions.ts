import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { assertOwner, requireTokenIdentifier } from "./lib/authz"

const nullableString = v.optional(v.union(v.null(), v.string()))
const nullableNumber = v.optional(v.union(v.null(), v.number()))

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    const limit = Math.min(Math.max(args.limit ?? 30, 1), 100)
    return await ctx.db
      .query("workoutSessions")
      .withIndex("by_ownerTokenIdentifier_and_startedAt", (q) =>
        q.eq("ownerTokenIdentifier", tokenIdentifier)
      )
      .order("desc")
      .take(limit)
  },
})

export const listByDateRange = query({
  args: { startTime: v.number(), endTime: v.number() },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    return await ctx.db
      .query("workoutSessions")
      .withIndex("by_ownerTokenIdentifier_and_startedAt", (q) =>
        q
          .eq("ownerTokenIdentifier", tokenIdentifier)
          .gte("startedAt", args.startTime)
          .lte("startedAt", args.endTime)
      )
      .order("asc")
      .collect()
  },
})

export const suggestNextExercises = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    const limit = Math.min(Math.max(args.limit ?? 6, 1), 20)

    const now = Date.now()
    const WINDOW_DAYS = 14
    const windowStart = now - WINDOW_DAYS * 24 * 60 * 60 * 1000

    const allSessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_ownerTokenIdentifier_and_startedAt", (q) =>
        q
          .eq("ownerTokenIdentifier", tokenIdentifier)
          .gte("startedAt", windowStart)
          .lte("startedAt", now)
      )
      .order("desc")
      .take(100)

    const dayKeyFor = (timestamp: number) =>
      new Date(timestamp).toISOString().slice(0, 10)

    const orderedDayKeys: string[] = []
    for (const session of allSessions) {
      const key = dayKeyFor(session.startedAt)
      if (!orderedDayKeys.includes(key)) {
        orderedDayKeys.push(key)
      }
    }

    const mostRecentDay = orderedDayKeys[0] ?? null
    const previousDay = orderedDayKeys[1] ?? null

    const today = dayKeyFor(now)
    const daysSince = (dayKey: string) => {
      const d = new Date(today)
      const target = new Date(dayKey)
      return Math.floor(
        (d.getTime() - target.getTime()) / (24 * 60 * 60 * 1000)
      )
    }

    const mostRecentDayMuscleGroups = new Set<string>()
    const previousDayMuscleGroups = new Set<string>()
    const muscleGroupLastTrainedDay = new Map<string, string>()
    const categoryDays = new Set<string>() // unique "category|dayKey" pairs
    const regionDays = new Set<string>()
    const recentExerciseIds = new Set<string>()
    const exerciseCache = new Map<string, Doc<"exercises"> | null>()
    const muscleGroupCache = new Map<string, Doc<"muscleGroups"> | null>()

    for (const session of allSessions) {
      const sessionDay = dayKeyFor(session.startedAt)
      const entries = await ctx.db
        .query("workoutSessionExercises")
        .withIndex("by_ownerTokenIdentifier_and_workoutSessionId", (q) =>
          q
            .eq("ownerTokenIdentifier", tokenIdentifier)
            .eq("workoutSessionId", session._id)
        )
        .take(100)

      for (const entry of entries) {
        recentExerciseIds.add(String(entry.exerciseId))

        const exerciseKey = String(entry.exerciseId)
        let exercise = exerciseCache.get(exerciseKey)
        if (exercise === undefined) {
          exercise = await ctx.db.get(entry.exerciseId)
          exerciseCache.set(exerciseKey, exercise)
        }
        if (!exercise?.muscleGroup) {
          continue
        }

        const muscleGroupId = String(exercise.muscleGroup)
        if (mostRecentDay && sessionDay === mostRecentDay) {
          mostRecentDayMuscleGroups.add(muscleGroupId)
        }
        if (previousDay && sessionDay === previousDay) {
          previousDayMuscleGroups.add(muscleGroupId)
        }

        const prev = muscleGroupLastTrainedDay.get(muscleGroupId)
        if (!prev || daysSince(sessionDay) < daysSince(prev)) {
          muscleGroupLastTrainedDay.set(muscleGroupId, sessionDay)
        }

        let mg = muscleGroupCache.get(muscleGroupId)
        if (mg === undefined) {
          mg = await ctx.db.get(exercise.muscleGroup)
          muscleGroupCache.set(muscleGroupId, mg)
        }

        const category = mg?.category ?? null
        const region = mg?.region ?? null

        if (category) {
          categoryDays.add(`${category}|${sessionDay}`)
        }
        if (region) {
          regionDays.add(`${region}|${sessionDay}`)
        }
      }
    }

    const preferredMuscleGroups = new Set<string>()
    for (const groupId of previousDayMuscleGroups) {
      if (!mostRecentDayMuscleGroups.has(groupId)) {
        preferredMuscleGroups.add(groupId)
      }
    }
    if (preferredMuscleGroups.size === 0) {
      for (const [groupId] of muscleGroupLastTrainedDay) {
        if (!mostRecentDayMuscleGroups.has(groupId)) {
          preferredMuscleGroups.add(groupId)
        }
      }
    }

    const muscleGroupNameCache = new Map<string, string>()
    const blockedMuscleGroupNames: string[] = []
    for (const groupId of mostRecentDayMuscleGroups) {
      const group = await ctx.db.get(groupId as Id<"muscleGroups">)
      if (group) {
        muscleGroupNameCache.set(groupId, group.name)
        blockedMuscleGroupNames.push(group.name)
      }
    }

    const allExercises = await ctx.db
      .query("exercises")
      .withIndex("by_isArchived", (q) => q.eq("isArchived", false))
      .take(500)

    const totalCategoryDays = new Map<string, number>()
    const uniqueTrainingDays = new Set<string>(orderedDayKeys)
    for (const cd of categoryDays) {
      const [cat] = cd.split("|")
      totalCategoryDays.set(cat, (totalCategoryDays.get(cat) ?? 0) + 1)
    }
    const totalRegionDays = new Map<string, number>()
    for (const rd of regionDays) {
      const [reg] = rd.split("|")
      totalRegionDays.set(reg, (totalRegionDays.get(reg) ?? 0) + 1)
    }

    const maxCatDays = Math.max(1, ...totalCategoryDays.values())
    const maxRegDays = Math.max(1, ...totalRegionDays.values())
    const totalTrainingDays = uniqueTrainingDays.size

    type Candidate = {
      exercise: Doc<"exercises">
      score: number
      reason: string
    }

    const candidates: Candidate[] = []

    for (const exercise of allExercises) {
      if (!exercise.muscleGroup) continue

      const groupId = String(exercise.muscleGroup)
      if (mostRecentDayMuscleGroups.has(groupId)) continue

      let score = 0
      const reasons: string[] = []

      const lastDay = muscleGroupLastTrainedDay.get(groupId)
      if (lastDay) {
        const gap = daysSince(lastDay)
        if (gap >= 5) {
          score += 15
          reasons.push(`Not trained in ${gap} days`)
        } else if (gap >= 4) {
          score += 12
          reasons.push(`Not trained in ${gap} days`)
        } else if (gap >= 3) {
          score += 8
          reasons.push(`Not trained in ${gap} days`)
        } else if (gap >= 2) {
          score += 4
        }
      } else {
        score += 10
        reasons.push("Never trained before")
      }

      let mg = muscleGroupCache.get(groupId)
      if (mg === undefined) {
        mg = await ctx.db.get(exercise.muscleGroup)
        muscleGroupCache.set(groupId, mg)
      }
      const category = mg?.category ?? null
      const region = mg?.region ?? null

      if (category && totalTrainingDays >= 2) {
        const catDays = totalCategoryDays.get(category) ?? 0
        const ratio = maxCatDays > 0 ? catDays / maxCatDays : 0
        if (ratio < 0.15) {
          score += 10
          reasons.push(`${category} category needs work`)
        } else if (ratio < 0.25) {
          score += 6
          reasons.push(`${category} category could use focus`)
        } else if (ratio < 0.33) {
          score += 2
        } else if (ratio > 0.55) {
          score -= 5
        }
      }

      if (region && totalTrainingDays >= 2) {
        const regDays = totalRegionDays.get(region) ?? 0
        const ratio = maxRegDays > 0 ? regDays / maxRegDays : 0
        if (ratio < 0.15) {
          score += 8
          reasons.push(`${region} body needs attention`)
        } else if (ratio < 0.25) {
          score += 4
        } else if (ratio > 0.55) {
          score -= 5
        }
      }

      if (preferredMuscleGroups.has(groupId)) {
        score += 10
        reasons.push("Due in rotation from your last workout")
      }

      if (!recentExerciseIds.has(String(exercise._id))) {
        score += 5
        reasons.push("Good variety pick")
      }

      if (exercise.isCompound) {
        score += 3
        reasons.push("Compound movement")
      }

      const reason =
        reasons.length > 0 ? reasons.join(" · ") : "Balanced recovery pick"

      candidates.push({ exercise, score, reason })
    }

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.exercise.name.localeCompare(b.exercise.name)
    })

    const top = candidates.slice(0, limit)

    for (const candidate of top) {
      const groupId = String(candidate.exercise.muscleGroup)
      if (!muscleGroupNameCache.has(groupId)) {
        const group = await ctx.db.get(
          candidate.exercise.muscleGroup as Id<"muscleGroups">
        )
        if (group) {
          muscleGroupNameCache.set(groupId, group.name)
        }
      }
    }

    const windowInfo =
      totalTrainingDays > 0
        ? {
            daysAnalyzed: WINDOW_DAYS,
            totalTrainingDays,
            categoryBreakdown: Object.fromEntries(totalCategoryDays),
            regionBreakdown: Object.fromEntries(totalRegionDays),
          }
        : null

    return {
      suggestedForDate: now,
      basedOn: {
        mostRecentWorkoutDay: mostRecentDay,
        previousWorkoutDay: previousDay,
      },
      window: windowInfo,
      blockedMuscleGroups: blockedMuscleGroupNames,
      recommendations: top.map((candidate) => {
        const groupId = String(candidate.exercise.muscleGroup)
        return {
          exerciseId: candidate.exercise._id,
          exerciseName: candidate.exercise.name,
          muscleGroupName: muscleGroupNameCache.get(groupId) ?? "Unknown",
          isCompound: candidate.exercise.isCompound ?? false,
          reason: candidate.reason,
        }
      }),
    }
  },
})

export const create = mutation({
  args: {
    startedAt: v.optional(v.number()),
    notes: nullableString,
    perceivedEffort: nullableNumber,
  },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    const now = Date.now()
    return await ctx.db.insert("workoutSessions", {
      ownerTokenIdentifier: tokenIdentifier,
      startedAt: args.startedAt ?? now,
      endedAt: null,
      notes: args.notes ?? null,
      perceivedEffort: args.perceivedEffort ?? null,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const finish = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
    endedAt: v.optional(v.number()),
    notes: nullableString,
    perceivedEffort: nullableNumber,
  },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new Error("Workout session not found")
    }
    assertOwner(session.ownerTokenIdentifier, tokenIdentifier)

    await ctx.db.patch(args.sessionId, {
      endedAt: args.endedAt ?? Date.now(),
      notes: args.notes ?? session.notes,
      perceivedEffort: args.perceivedEffort ?? session.perceivedEffort,
      updatedAt: Date.now(),
    })
    return args.sessionId
  },
})

export const get = query({
  args: { sessionId: v.id("workoutSessions") },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      return null
    }
    assertOwner(session.ownerTokenIdentifier, tokenIdentifier)

    const sessionExercises = await ctx.db
      .query("workoutSessionExercises")
      .withIndex("by_ownerTokenIdentifier_and_workoutSessionId", (q) =>
        q
          .eq("ownerTokenIdentifier", tokenIdentifier)
          .eq("workoutSessionId", session._id)
      )
      .take(200)

    const setsBySessionExercise = await Promise.all(
      sessionExercises.map(async (entry) => {
        const sets = await ctx.db
          .query("sets")
          .withIndex(
            "by_ownerTokenIdentifier_and_workoutSessionExerciseId",
            (q) =>
              q
                .eq("ownerTokenIdentifier", tokenIdentifier)
                .eq("workoutSessionExerciseId", entry._id)
          )
          .take(100)
        return {
          workoutSessionExerciseId: entry._id,
          sets,
        }
      })
    )

    return {
      session,
      sessionExercises,
      setsBySessionExercise,
    }
  },
})
