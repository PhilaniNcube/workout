import { v } from "convex/values";
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
