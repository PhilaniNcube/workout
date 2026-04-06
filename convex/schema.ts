import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	muscleGroups: defineTable({
		name: v.string(),
		illustrationStorageId: v.optional(v.union(v.null(), v.id("_storage"))),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_name", ["name"]),

	exercises: defineTable({
		name: v.string(),
		muscleGroup: v.optional(v.union(v.null(), v.id("muscleGroups"))),
		equipment: v.optional(v.union(v.null(), v.string())),
		isArchived: v.boolean(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_name", ["name"])
		.index("by_isArchived", ["isArchived"]),

	workoutSessions: defineTable({
		ownerTokenIdentifier: v.string(),
		startedAt: v.number(),
		endedAt: v.optional(v.union(v.null(), v.number())),
		notes: v.optional(v.union(v.null(), v.string())),
		perceivedEffort: v.optional(v.union(v.null(), v.number())),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_ownerTokenIdentifier_and_startedAt", ["ownerTokenIdentifier", "startedAt"]),

	workoutSessionExercises: defineTable({
		ownerTokenIdentifier: v.string(),
		workoutSessionId: v.id("workoutSessions"),
		exerciseId: v.id("exercises"),
		order: v.number(),
		notes: v.optional(v.union(v.null(), v.string())),
		createdAt: v.number(),
	})
		.index("by_ownerTokenIdentifier_and_workoutSessionId", ["ownerTokenIdentifier", "workoutSessionId"])
		.index("by_ownerTokenIdentifier_and_exerciseId", ["ownerTokenIdentifier", "exerciseId"]),

	sets: defineTable({
		ownerTokenIdentifier: v.string(),
		workoutSessionExerciseId: v.id("workoutSessionExercises"),
		setNumber: v.number(),
		reps: v.optional(v.union(v.null(), v.number())),
		weight: v.optional(v.union(v.null(), v.number())),
		durationSeconds: v.optional(v.union(v.null(), v.number())),
		distance: v.optional(v.union(v.null(), v.number())),
		restSeconds: v.optional(v.union(v.null(), v.number())),
		rir: v.optional(v.union(v.null(), v.number())),
		effortLevel: v.optional(v.union(v.null(), v.number())),
		isWarmup: v.boolean(),
		createdAt: v.number(),
	})
		.index("by_ownerTokenIdentifier_and_workoutSessionExerciseId", ["ownerTokenIdentifier", "workoutSessionExerciseId"])
		.index("by_ownerTokenIdentifier_and_createdAt", ["ownerTokenIdentifier", "createdAt"]),

	bodyMetrics: defineTable({
		ownerTokenIdentifier: v.string(),
		recordedAt: v.number(),
		bodyWeight: v.optional(v.union(v.null(), v.number())),
		bodyFatPercent: v.optional(v.union(v.null(), v.number())),
		waistCm: v.optional(v.union(v.null(), v.number())),
		chestCm: v.optional(v.union(v.null(), v.number())),
		notes: v.optional(v.union(v.null(), v.string())),
		createdAt: v.number(),
	})
		.index("by_ownerTokenIdentifier_and_recordedAt", ["ownerTokenIdentifier", "recordedAt"]),

	goals: defineTable({
		ownerTokenIdentifier: v.string(),
		type: v.string(),
		exerciseId: v.optional(v.union(v.null(), v.id("exercises"))),
		targetValue: v.number(),
		targetDate: v.optional(v.union(v.null(), v.number())),
		status: v.string(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_ownerTokenIdentifier_and_status", ["ownerTokenIdentifier", "status"])
		.index("by_ownerTokenIdentifier_and_targetDate", ["ownerTokenIdentifier", "targetDate"]),

	personalRecords: defineTable({
		ownerTokenIdentifier: v.string(),
		exerciseId: v.id("exercises"),
		recordType: v.string(),
		value: v.number(),
		achievedAt: v.number(),
		sourceSetId: v.optional(v.union(v.null(), v.id("sets"))),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_ownerTokenIdentifier_and_exerciseId_and_recordType", [
			"ownerTokenIdentifier",
			"exerciseId",
			"recordType",
		]),
});