import { v } from "convex/values";
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
