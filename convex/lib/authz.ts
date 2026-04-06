import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireTokenIdentifier(
	ctx: QueryCtx | MutationCtx,
): Promise<string> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new Error("Unauthorized");
	}
	return identity.tokenIdentifier;
}

export function assertOwner(
	ownerTokenIdentifier: string,
	tokenIdentifier: string,
): void {
	if (ownerTokenIdentifier !== tokenIdentifier) {
		throw new Error("Forbidden");
	}
}
