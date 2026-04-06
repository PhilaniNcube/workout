import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertOwner, requireTokenIdentifier } from "./lib/authz";

const nullableString = v.optional(v.union(v.null(), v.string()));
const nullableNumber = v.optional(v.union(v.null(), v.number()));

export const list = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);
		return await ctx.db
			.query("workoutSessions")
			.withIndex("by_ownerTokenIdentifier_and_startedAt", (q) =>
				q.eq("ownerTokenIdentifier", tokenIdentifier),
			)
			.order("desc")
			.take(limit);
	},
});

export const listByDateRange = query({
	args: { startTime: v.number(), endTime: v.number() },
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		return await ctx.db
			.query("workoutSessions")
			.withIndex("by_ownerTokenIdentifier_and_startedAt", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.gte("startedAt", args.startTime)
					.lte("startedAt", args.endTime),
			)
			.order("asc")
			.collect();
	},
});

export const suggestNextExercises = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const limit = Math.min(Math.max(args.limit ?? 6, 1), 20);

		const now = Date.now();
		const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;

		const recentSessions = await ctx.db
			.query("workoutSessions")
			.withIndex("by_ownerTokenIdentifier_and_startedAt", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.gte("startedAt", twoDaysAgo)
					.lte("startedAt", now),
			)
			.order("desc")
			.take(50);

		const dayKeyFor = (timestamp: number) =>
			new Date(timestamp).toISOString().slice(0, 10);

		const recentDayKeys: string[] = [];
		for (const session of recentSessions) {
			const key = dayKeyFor(session.startedAt);
			if (!recentDayKeys.includes(key)) {
				recentDayKeys.push(key);
			}
		}

		const mostRecentDay = recentDayKeys[0] ?? null;
		const previousDay = recentDayKeys[1] ?? null;

		const mostRecentDayMuscleGroups = new Set<string>();
		const previousDayMuscleGroups = new Set<string>();
		const recentMuscleGroups = new Set<string>();
		const recentExerciseIds = new Set<string>();

		const exerciseCache = new Map<string, Doc<"exercises"> | null>();
		for (const session of recentSessions) {
			const entries = await ctx.db
				.query("workoutSessionExercises")
				.withIndex("by_ownerTokenIdentifier_and_workoutSessionId", (q) =>
					q
						.eq("ownerTokenIdentifier", tokenIdentifier)
						.eq("workoutSessionId", session._id),
				)
				.take(100);

			for (const entry of entries) {
				recentExerciseIds.add(String(entry.exerciseId));

				const exerciseKey = String(entry.exerciseId);
				let exercise = exerciseCache.get(exerciseKey);
				if (exercise === undefined) {
					exercise = await ctx.db.get(entry.exerciseId);
					exerciseCache.set(exerciseKey, exercise);
				}
				if (!exercise?.muscleGroup) {
					continue;
				}

				const muscleGroupKey = String(exercise.muscleGroup);
				recentMuscleGroups.add(muscleGroupKey);

				const sessionDay = dayKeyFor(session.startedAt);
				if (mostRecentDay && sessionDay === mostRecentDay) {
					mostRecentDayMuscleGroups.add(muscleGroupKey);
				}
				if (previousDay && sessionDay === previousDay) {
					previousDayMuscleGroups.add(muscleGroupKey);
				}
			}
		}

		const preferredMuscleGroups = new Set<string>();
		for (const groupId of previousDayMuscleGroups) {
			if (!mostRecentDayMuscleGroups.has(groupId)) {
				preferredMuscleGroups.add(groupId);
			}
		}

		if (preferredMuscleGroups.size === 0) {
			for (const groupId of recentMuscleGroups) {
				if (!mostRecentDayMuscleGroups.has(groupId)) {
					preferredMuscleGroups.add(groupId);
				}
			}
		}

		const muscleGroupNameCache = new Map<string, string>();
		const blockedMuscleGroupNames: string[] = [];
		for (const groupId of mostRecentDayMuscleGroups) {
			const group = await ctx.db.get(groupId as Id<"muscleGroups">);
			if (group) {
				muscleGroupNameCache.set(groupId, group.name);
				blockedMuscleGroupNames.push(group.name);
			}
		}

		const allExercises = await ctx.db
			.query("exercises")
			.withIndex("by_isArchived", (q) => q.eq("isArchived", false))
			.take(500);

		const candidates = allExercises
			.filter((exercise) => {
				if (!exercise.muscleGroup) {
					return false;
				}
				const groupId = String(exercise.muscleGroup);
				if (mostRecentDayMuscleGroups.has(groupId)) {
					return false;
				}
				if (recentExerciseIds.has(String(exercise._id))) {
					return false;
				}
				return true;
			})
			.map((exercise) => {
				const groupId = String(exercise.muscleGroup);
				let score = 0;
				let reason = "Keeps recovery balanced across muscle groups.";

				if (preferredMuscleGroups.has(groupId)) {
					score += 5;
					reason = "Targets a muscle group from your recent rotation without back-to-back overload.";
				} else if (recentMuscleGroups.has(groupId)) {
					score += 2;
					reason = "Builds on your recent training pattern while avoiding consecutive-day repeats.";
				}

				return {
					exercise,
					score,
					reason,
				};
			})
			.sort((a, b) => {
				if (b.score !== a.score) {
					return b.score - a.score;
				}
				return a.exercise.name.localeCompare(b.exercise.name);
			})
			.slice(0, limit);

		for (const candidate of candidates) {
			const groupId = String(candidate.exercise.muscleGroup);
			if (!muscleGroupNameCache.has(groupId)) {
				const group = await ctx.db.get(candidate.exercise.muscleGroup as Id<"muscleGroups">);
				if (group) {
					muscleGroupNameCache.set(groupId, group.name);
				}
			}
		}

		return {
			suggestedForDate: now,
			basedOn: {
				mostRecentWorkoutDay: mostRecentDay,
				previousWorkoutDay: previousDay,
			},
			blockedMuscleGroups: blockedMuscleGroupNames,
			recommendations: candidates.map((candidate) => {
				const groupId = String(candidate.exercise.muscleGroup);
				return {
					exerciseId: candidate.exercise._id,
					exerciseName: candidate.exercise.name,
					muscleGroupName: muscleGroupNameCache.get(groupId) ?? "Unknown",
					reason: candidate.reason,
				};
			}),
		};
	},
});

export const create = mutation({
	args: {
		startedAt: v.optional(v.number()),
		notes: nullableString,
		perceivedEffort: nullableNumber,
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const now = Date.now();
		return await ctx.db.insert("workoutSessions", {
			ownerTokenIdentifier: tokenIdentifier,
			startedAt: args.startedAt ?? now,
			endedAt: null,
			notes: args.notes ?? null,
			perceivedEffort: args.perceivedEffort ?? null,
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const finish = mutation({
	args: {
		sessionId: v.id("workoutSessions"),
		endedAt: v.optional(v.number()),
		notes: nullableString,
		perceivedEffort: nullableNumber,
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const session = await ctx.db.get(args.sessionId);
		if (!session) {
			throw new Error("Workout session not found");
		}
		assertOwner(session.ownerTokenIdentifier, tokenIdentifier);

		await ctx.db.patch(args.sessionId, {
			endedAt: args.endedAt ?? Date.now(),
			notes: args.notes ?? session.notes,
			perceivedEffort: args.perceivedEffort ?? session.perceivedEffort,
			updatedAt: Date.now(),
		});
		return args.sessionId;
	},
});

export const get = query({
	args: { sessionId: v.id("workoutSessions") },
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const session = await ctx.db.get(args.sessionId);
		if (!session) {
			return null;
		}
		assertOwner(session.ownerTokenIdentifier, tokenIdentifier);

		const sessionExercises = await ctx.db
			.query("workoutSessionExercises")
			.withIndex("by_ownerTokenIdentifier_and_workoutSessionId", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("workoutSessionId", session._id),
			)
			.take(200);

		const setsBySessionExercise = await Promise.all(
			sessionExercises.map(async (entry) => {
				const sets = await ctx.db
					.query("sets")
					.withIndex("by_ownerTokenIdentifier_and_workoutSessionExerciseId", (q) =>
						q
							.eq("ownerTokenIdentifier", tokenIdentifier)
							.eq("workoutSessionExerciseId", entry._id),
					)
					.take(100);
				return {
					workoutSessionExerciseId: entry._id,
					sets,
				};
			}),
		);

		return {
			session,
			sessionExercises,
			setsBySessionExercise,
		};
	},
});
