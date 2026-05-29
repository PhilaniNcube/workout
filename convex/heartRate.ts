import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { assertOwner, requireTokenIdentifier } from "./lib/authz"

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200)
    return await ctx.db
      .query("heartRateReadings")
      .withIndex("by_ownerTokenIdentifier_and_recordedAt", (q) =>
        q.eq("ownerTokenIdentifier", tokenIdentifier)
      )
      .order("desc")
      .take(limit)
  },
})

export const log = mutation({
  args: {
    recordedAt: v.optional(v.number()),
    bpm: v.number(),
    source: v.optional(v.string()),
    isResting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    const now = Date.now()
    return await ctx.db.insert("heartRateReadings", {
      ownerTokenIdentifier: tokenIdentifier,
      recordedAt: args.recordedAt ?? now,
      bpm: args.bpm,
      source: args.source ?? "manual",
      isResting: args.isResting,
      createdAt: now,
    })
  },
})

export const logInternal = internalMutation({
  args: {
    recordedAt: v.optional(v.number()),
    bpm: v.number(),
    source: v.string(),
    isResting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    const now = Date.now()
    return await ctx.db.insert("heartRateReadings", {
      ownerTokenIdentifier: tokenIdentifier,
      recordedAt: args.recordedAt ?? now,
      bpm: args.bpm,
      source: args.source,
      isResting: args.isResting,
      createdAt: now,
    })
  },
})

export const remove = mutation({
  args: {
    readingId: v.id("heartRateReadings"),
  },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireTokenIdentifier(ctx)
    const reading = await ctx.db.get(args.readingId)
    if (!reading) {
      throw new Error("Heart rate reading not found")
    }
    assertOwner(reading.ownerTokenIdentifier, tokenIdentifier)
    await ctx.db.delete(args.readingId)
  },
})
