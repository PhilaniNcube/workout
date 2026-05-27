import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireTokenIdentifier } from "./lib/authz";

export const getStreaks = query({
	args: {},
	handler: async (ctx) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);

		const sessions = await ctx.db
			.query("workoutSessions")
			.withIndex("by_ownerTokenIdentifier_and_startedAt", (q) =>
				q.eq("ownerTokenIdentifier", tokenIdentifier),
			)
			.order("desc")
			.take(365);

		const workoutDays = new Set<string>();
		for (const session of sessions) {
			const day = new Date(session.startedAt).toISOString().slice(0, 10);
			workoutDays.add(day);
		}

		const sortedDays = Array.from(workoutDays).sort().reverse();

		let currentStreak = 0;
		const today = new Date().toISOString().slice(0, 10);

		const checkDate = new Date();
		for (let i = 0; ; i++) {
			const d = new Date(checkDate);
			d.setDate(d.getDate() - i);
			const key = d.toISOString().slice(0, 10);
			if (workoutDays.has(key)) {
				currentStreak++;
			} else {
				break;
			}
		}

		let longestStreak = 0;
		let tempStreak = 0;
		const allDates: string[] = [];
		const startDate = new Date(sortedDays[sortedDays.length - 1] ?? today);
		const endDate = new Date(today);

		for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
			const key = d.toISOString().slice(0, 10);
			allDates.push(key);
		}

		for (const day of allDates) {
			if (workoutDays.has(day)) {
				tempStreak++;
				longestStreak = Math.max(longestStreak, tempStreak);
			} else {
				tempStreak = 0;
			}
		}

		const weekStart = new Date();
		weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
		const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

		let weekCount = 0;
		let monthCount = 0;
		for (const day of workoutDays) {
			const d = new Date(day);
			if (d >= weekStart) weekCount++;
			if (d >= monthStart) monthCount++;
		}

		const totalWorkouts = sessions.length;

		return {
			currentStreak,
			longestStreak,
			workoutsThisWeek: weekCount,
			workoutsThisMonth: monthCount,
			totalWorkouts,
			totalWorkoutDays: workoutDays.size,
		};
	},
});

export const getOverloadAlerts = query({
	args: {
		minStaleWeeks: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const weeks = args.minStaleWeeks ?? 2;
		const cutoff = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000;

		const exercises = await ctx.db
			.query("exercises")
			.withIndex("by_isArchived", (q) => q.eq("isArchived", false))
			.take(200);

		const alerts: {
			exerciseId: string;
			exerciseName: string;
			bestWeight: number;
			bestWeightDate: number | null;
			weeksStale: number;
		}[] = [];

		for (const exercise of exercises) {
			const record = await ctx.db
				.query("personalRecords")
				.withIndex("by_ownerTokenIdentifier_and_exerciseId_and_recordType", (q) =>
					q
						.eq("ownerTokenIdentifier", tokenIdentifier)
						.eq("exerciseId", exercise._id)
						.eq("recordType", "max_weight"),
				)
				.take(1);

			if (record.length === 0) continue;
			const pr = record[0];

			if (pr.achievedAt < cutoff) {
				const weeksStale = Math.round(
					(Date.now() - pr.achievedAt) / (7 * 24 * 60 * 60 * 1000),
				);
				alerts.push({
					exerciseId: exercise._id,
					exerciseName: exercise.name,
					bestWeight: pr.value,
					bestWeightDate: pr.achievedAt,
					weeksStale,
				});
			}
		}

		alerts.sort((a, b) => b.weeksStale - a.weeksStale);

		return alerts.slice(0, 10);
	},
});

export const getWeeklyVolume = query({
	args: {},
	handler: async (ctx) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);

		const now = new Date();
		const dayOfWeek = now.getDay();
		const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
		const weekStart = new Date(now);
		weekStart.setDate(now.getDate() - mondayOffset);
		weekStart.setHours(0, 0, 0, 0);

		const prevWeekStart = new Date(weekStart);
		prevWeekStart.setDate(weekStart.getDate() - 7);

		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekStart.getDate() + 7);

		const thisWeekSessions = await ctx.db
			.query("workoutSessions")
			.withIndex("by_ownerTokenIdentifier_and_startedAt", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.gte("startedAt", weekStart.getTime())
					.lt("startedAt", weekEnd.getTime()),
			)
			.take(50);

		const prevWeekSessions = await ctx.db
			.query("workoutSessions")
			.withIndex("by_ownerTokenIdentifier_and_startedAt", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.gte("startedAt", prevWeekStart.getTime())
					.lt("startedAt", weekStart.getTime()),
			)
			.take(50);

		const exerciseCache = new Map<string, Doc<"exercises"> | null>();
		const muscleGroupCache = new Map<string, Doc<"muscleGroups"> | null>();

		async function computeVolume(sessions: Doc<"workoutSessions">[]) {
			let totalVolume = 0;
			let totalSets = 0;
			let totalReps = 0;
			const byMuscleGroup = new Map<string, { name: string; volume: number; sets: number }>();

			for (const session of sessions) {
				const sessionExercises = await ctx.db
					.query("workoutSessionExercises")
					.withIndex("by_ownerTokenIdentifier_and_workoutSessionId", (q) =>
						q
							.eq("ownerTokenIdentifier", tokenIdentifier)
							.eq("workoutSessionId", session._id),
					)
					.take(100);

				for (const se of sessionExercises) {
					const sets = await ctx.db
						.query("sets")
						.withIndex("by_ownerTokenIdentifier_and_workoutSessionExerciseId", (q) =>
							q
								.eq("ownerTokenIdentifier", tokenIdentifier)
								.eq("workoutSessionExerciseId", se._id),
						)
						.take(100);

					const exKey = String(se.exerciseId);
					let exercise = exerciseCache.get(exKey);
					if (exercise === undefined) {
						exercise = await ctx.db.get(se.exerciseId);
						exerciseCache.set(exKey, exercise);
					}

					let muscleGroupKey = "uncategorized";
					let muscleGroupName = "Uncategorized";
					if (exercise?.muscleGroup) {
						const mgKey = String(exercise.muscleGroup);
						let mg = muscleGroupCache.get(mgKey);
						if (mg === undefined) {
							mg = await ctx.db.get(exercise.muscleGroup);
							muscleGroupCache.set(mgKey, mg);
						}
						if (mg) {
							muscleGroupKey = mgKey;
							muscleGroupName = mg.name;
						}
					}

					for (const set of sets) {
						if (set.isWarmup) continue;
						totalSets++;
						if (set.reps != null) totalReps += set.reps;
						if (set.weight != null && set.reps != null) {
							totalVolume += set.weight * set.reps;
						}

						const existing = byMuscleGroup.get(muscleGroupKey) ?? {
							name: muscleGroupName,
							volume: 0,
							sets: 0,
						};
						existing.sets++;
						if (set.weight != null && set.reps != null) {
							existing.volume += set.weight * set.reps;
						}
						byMuscleGroup.set(muscleGroupKey, existing);
					}
				}
			}

			return {
				totalVolume,
				totalSets,
				totalReps,
				byMuscleGroup: Array.from(byMuscleGroup.values()).sort(
					(a, b) => b.volume - a.volume,
				),
			};
		}

		const thisWeek = await computeVolume(thisWeekSessions);
		const prevWeek = await computeVolume(prevWeekSessions);

		return {
			thisWeek,
			prevWeek,
			weekStartMs: weekStart.getTime(),
			weekEndMs: weekEnd.getTime(),
		};
	},
});

export const getMuscleBalance = query({
	args: {
		weeks: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const weeks = args.weeks ?? 4;
		const cutoff = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000;

		const sessions = await ctx.db
			.query("workoutSessions")
			.withIndex("by_ownerTokenIdentifier_and_startedAt", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.gte("startedAt", cutoff),
			)
			.take(200);

		const exerciseCache = new Map<string, Doc<"exercises"> | null>();
		const muscleGroupCache = new Map<string, Doc<"muscleGroups"> | null>();
		const muscleGroupSets = new Map<string, { name: string; sets: number; exercises: Set<string> }>();

		for (const session of sessions) {
			const sessionExercises = await ctx.db
				.query("workoutSessionExercises")
				.withIndex("by_ownerTokenIdentifier_and_workoutSessionId", (q) =>
					q
						.eq("ownerTokenIdentifier", tokenIdentifier)
						.eq("workoutSessionId", session._id),
				)
				.take(100);

			for (const se of sessionExercises) {
				const sets = await ctx.db
					.query("sets")
					.withIndex("by_ownerTokenIdentifier_and_workoutSessionExerciseId", (q) =>
						q
							.eq("ownerTokenIdentifier", tokenIdentifier)
							.eq("workoutSessionExerciseId", se._id),
					)
					.take(100);

				const exKey = String(se.exerciseId);
				let exercise = exerciseCache.get(exKey);
				if (exercise === undefined) {
					exercise = await ctx.db.get(se.exerciseId);
					exerciseCache.set(exKey, exercise);
				}

				let muscleGroupKey = "uncategorized";
				let muscleGroupName = "Uncategorized";
				if (exercise?.muscleGroup) {
					const mgKey = String(exercise.muscleGroup);
					let mg = muscleGroupCache.get(mgKey);
					if (mg === undefined) {
						mg = await ctx.db.get(exercise.muscleGroup);
						muscleGroupCache.set(mgKey, mg);
					}
					if (mg) {
						muscleGroupKey = mgKey;
						muscleGroupName = mg.name;
					}
				}

				const workingSets = sets.filter((s) => !s.isWarmup);
				if (workingSets.length === 0) continue;

				const existing = muscleGroupSets.get(muscleGroupKey) ?? {
					name: muscleGroupName,
					sets: 0,
					exercises: new Set<string>(),
				};
				existing.sets += workingSets.length;
				existing.exercises.add(exKey);
				muscleGroupSets.set(muscleGroupKey, existing);
			}
		}

		const result = Array.from(muscleGroupSets.entries())
			.map(([key, val]) => ({
				muscleGroupId: key,
				muscleGroupName: val.name,
				totalSets: val.sets,
				exerciseCount: val.exercises.size,
				setsPerWeek: Math.round((val.sets / weeks) * 10) / 10,
			}))
			.sort((a, b) => b.totalSets - a.totalSets);

		return {
			weeks,
			muscleGroups: result,
		};
	},
});

export const getSessionHistory = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);

		const sessions = await ctx.db
			.query("workoutSessions")
			.withIndex("by_ownerTokenIdentifier_and_startedAt", (q) =>
				q.eq("ownerTokenIdentifier", tokenIdentifier),
			)
			.order("desc")
			.take(limit);

		const exerciseCache = new Map<string, Doc<"exercises"> | null>();
		const muscleGroupCache = new Map<string, Doc<"muscleGroups"> | null>();

		const results: {
			session: Doc<"workoutSessions">;
			exercises: {
				exerciseId: Id<"exercises">;
				exerciseName: string;
				muscleGroupName: string | null;
				setCount: number;
				totalVolume: number;
				maxWeight: number | null;
			}[];
			totalVolume: number;
			totalSets: number;
			duration: number | null;
		}[] = [];

		for (const session of sessions) {
			const sessionExercises = await ctx.db
				.query("workoutSessionExercises")
				.withIndex("by_ownerTokenIdentifier_and_workoutSessionId", (q) =>
					q
						.eq("ownerTokenIdentifier", tokenIdentifier)
						.eq("workoutSessionId", session._id),
				)
				.take(100);

			let sessionVolume = 0;
			let sessionSets = 0;
			const exerciseDetails: typeof results[number]["exercises"] = [];

			for (const se of sessionExercises) {
				const sets = await ctx.db
					.query("sets")
					.withIndex("by_ownerTokenIdentifier_and_workoutSessionExerciseId", (q) =>
						q
							.eq("ownerTokenIdentifier", tokenIdentifier)
							.eq("workoutSessionExerciseId", se._id),
					)
					.take(100);

				const exKey = String(se.exerciseId);
				let exercise = exerciseCache.get(exKey);
				if (exercise === undefined) {
					exercise = await ctx.db.get(se.exerciseId);
					exerciseCache.set(exKey, exercise);
				}

				let muscleGroupName: string | null = null;
				if (exercise?.muscleGroup) {
					const mgKey = String(exercise.muscleGroup);
					let mg = muscleGroupCache.get(mgKey);
					if (mg === undefined) {
						mg = await ctx.db.get(exercise.muscleGroup);
						muscleGroupCache.set(mgKey, mg);
					}
					muscleGroupName = mg?.name ?? null;
				}

				let exerciseVolume = 0;
				let maxWeight: number | null = null;
				const workingSets = sets.filter((s) => !s.isWarmup);

				for (const set of workingSets) {
					sessionSets++;
					if (set.weight != null && set.reps != null) {
						const vol = set.weight * set.reps;
						exerciseVolume += vol;
						sessionVolume += vol;
					}
					if (set.weight != null && (maxWeight == null || set.weight > maxWeight)) {
						maxWeight = set.weight;
					}
				}

				exerciseDetails.push({
					exerciseId: se.exerciseId,
					exerciseName: exercise?.name ?? "Unknown",
					muscleGroupName,
					setCount: workingSets.length,
					totalVolume: exerciseVolume,
					maxWeight,
				});
			}

			const duration = session.endedAt
				? Math.round((session.endedAt - session.startedAt) / 60000)
				: null;

			results.push({
				session,
				exercises: exerciseDetails,
				totalVolume: sessionVolume,
				totalSets: sessionSets,
				duration,
			});
		}

		return results;
	},
});
