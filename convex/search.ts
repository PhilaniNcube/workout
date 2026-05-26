import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireTokenIdentifier } from "./lib/authz";

export const search = query({
	args: {
		query: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const q = args.query.trim().toLowerCase();
		if (!q) return { exercises: [], muscleGroups: [], sessions: [] };

		const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);

		const allExercises = await ctx.db
			.query("exercises")
			.withIndex("by_isArchived", (idx) => idx.eq("isArchived", false))
			.take(200);

		const matchedExercises = allExercises
			.filter((e) => e.name.toLowerCase().includes(q))
			.slice(0, limit);

		const allMuscleGroups = await ctx.db
			.query("muscleGroups")
			.withIndex("by_name")
			.take(50);

		const matchedMuscleGroups = allMuscleGroups
			.filter((mg) => mg.name.toLowerCase().includes(q))
			.slice(0, limit);

		const allSessions = await ctx.db
			.query("workoutSessions")
			.withIndex("by_ownerTokenIdentifier_and_startedAt", (idx) =>
				idx.eq("ownerTokenIdentifier", tokenIdentifier),
			)
			.order("desc")
			.take(100);

		const matchedSessions = allSessions
			.filter((s) => {
				if (s.notes?.toLowerCase().includes(q)) return true;
				return false;
			})
			.slice(0, limit);

		return {
			exercises: matchedExercises,
			muscleGroups: matchedMuscleGroups,
			sessions: matchedSessions,
		};
	},
});
