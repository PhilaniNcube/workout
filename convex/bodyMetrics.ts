import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireTokenIdentifier } from "./lib/authz";

const nullableNumber = v.optional(v.union(v.null(), v.number()));
const nullableString = v.optional(v.union(v.null(), v.string()));

export const list = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
		return await ctx.db
			.query("bodyMetrics")
			.withIndex("by_ownerTokenIdentifier_and_recordedAt", (q) =>
				q.eq("ownerTokenIdentifier", tokenIdentifier),
			)
			.order("desc")
			.take(limit);
	},
});

export const log = mutation({
	args: {
		recordedAt: v.optional(v.number()),
		bodyWeight: nullableNumber,
		bodyFatPercent: nullableNumber,
		waistCm: nullableNumber,
		chestCm: nullableNumber,
		notes: nullableString,
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const now = Date.now();
		return await ctx.db.insert("bodyMetrics", {
			ownerTokenIdentifier: tokenIdentifier,
			recordedAt: args.recordedAt ?? now,
			bodyWeight: args.bodyWeight ?? null,
			bodyFatPercent: args.bodyFatPercent ?? null,
			waistCm: args.waistCm ?? null,
			chestCm: args.chestCm ?? null,
			notes: args.notes ?? null,
			createdAt: now,
		});
	},
});
