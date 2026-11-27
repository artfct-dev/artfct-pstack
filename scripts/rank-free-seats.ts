#!/usr/bin/env bun
// Ranks a provider's free chat seats by observed usage, with a family-distinct
// pick list. Used by skills/setup-pstack-omp when resolving the `free` and
// `free+big` packs.
//
// Usage: bun scripts/rank-free-seats.ts [--roster URL] [--seats N] [--json]
//
// Default roster is OpenCode Go's public model list; the default usage snapshot
// is OpenCode's published leaderboard. Neither needs credentials.

export {};

const args = process.argv.slice(2);
const opts = new Map<string, string>();
for (let index = 0; index < args.length; index += 1) {
	const arg = args[index];
	if (!arg.startsWith("--") || arg === "--json") continue;
	opts.set(arg.slice(2), args[index + 1] ?? "");
	index += 1;
}
const json = args.includes("--json");
const rosterUrl = opts.get("roster") || "https://opencode.ai/inference/go/v1/models";
const seats = Number(opts.get("seats") || 3);
if (!Number.isInteger(seats) || seats < 1) throw new Error("--seats must be a positive integer");

const USAGE_URL = "https://opencode.ai/data/index.json";

type RosterModel = {
	id: string;
	type?: string;
	family?: string;
	release_date?: string;
	capabilities?: { reasoning?: { supported?: boolean }; tools?: { supported?: boolean } };
	limit?: { context?: number };
	cost?: { text?: { input?: { price?: number }; output?: { price?: number } } };
};

type UsageEntry = { rank: number; model: string; lab?: string; tokens: number };

async function getJson<T>(url: string): Promise<T> {
	const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
	if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
	return (await res.json()) as T;
}

// Roster ids carry plan suffixes the leaderboard does not: `hy4-flash-free`,
// `iceman-contributor-free`. Normalising both sides collapses those, and the
// prefix rule covers codenames such as `beam-1.0-501b-a23b` for `beam-free`.
const normalise = (id: string): string =>
	id
		.toLowerCase()
		.replace(/-(?:contributor-)?free$/, "")
		.replace(/-contributor$/, "");

const roster = await getJson<{ data: RosterModel[] }>(rosterUrl);
const usage = await getJson<{ updatedAt?: string; leaderboard: { pastWeek: UsageEntry[] } }>(USAGE_URL);

const freeModels = roster.data.filter(model => {
	if (model.type && model.type !== "chat") return false;
	const cost = model.cost?.text;
	return (cost?.input?.price ?? 0) === 0 && (cost?.output?.price ?? 0) === 0;
});

const paidModels = roster.data.filter(model => {
	if (model.type && model.type !== "chat") return false;
	const cost = model.cost?.text;
	const paid = (cost?.input?.price ?? 0) > 0 || (cost?.output?.price ?? 0) > 0;
	return paid && model.capabilities?.reasoning?.supported && model.capabilities?.tools?.supported;
});

const usageFor = (model: RosterModel): UsageEntry | undefined => {
	const base = normalise(model.id);
	const exact = usage.leaderboard.pastWeek.find(entry => normalise(entry.model) === base);
	if (exact) return exact;
	return usage.leaderboard.pastWeek.find(entry => normalise(entry.model).startsWith(`${base}-`));
};

const ranked = freeModels
	.map(model => {
		const entry = usageFor(model);
		return {
			id: model.id,
			family: model.family ?? entry?.lab ?? null,
			lab: entry?.lab ?? null,
			context: model.limit?.context ?? 0,
			release: model.release_date ?? null,
			reasoning: model.capabilities?.reasoning?.supported ?? false,
			tools: model.capabilities?.tools?.supported ?? false,
			usageRank: entry?.rank ?? null,
			tokens: entry?.tokens ?? 0,
		};
	})
	.sort((a, b) => b.tokens - a.tokens || b.context - a.context);

// A family token is only usable when the provider names one, and it is compared
// by its first segment so `hy` (paid hy4) and `hy-flash-free` count as one
// vendor. `unknown` labs and ids without a family never count as a seat.
const familyOf = (seat: typeof ranked[number]): string | null => {
	for (const token of [seat.family, seat.lab]) {
		if (!token || token === "unknown") continue;
		const root = token.split("-")[0];
		if (root) return root;
	}
	return null;
};

const distinct = (pool: typeof ranked, count: number) => {
	const picked: typeof ranked = [];
	const seen = new Set<string>();
	for (const seat of pool) {
		const token = familyOf(seat);
		if (!token || seen.has(token)) continue;
		seen.add(token);
		picked.push(seat);
		if (picked.length === count) break;
	}
	return picked;
};

const rootOf = (token: string | null | undefined): string | null => {
	if (!token || token === "unknown") return null;
	return token.split("-")[0] || null;
};

const picks = distinct(ranked, seats);
const used = new Set(picks.map(familyOf).filter((token): token is string => token !== null));
for (const family of (opts.get("avoid") ?? "").split(",").filter(Boolean)) {
	const root = rootOf(family.trim());
	if (root) used.add(root);
}
const missing = Math.max(0, seats - picks.length);
const backfill = paidModels
	.map(model => ({
		id: model.id,
		family: rootOf(model.family),
		price: model.cost?.text?.input?.price ?? 0,
		tokens: usageFor(model)?.tokens ?? 0,
	}))
	.filter(model => model.family !== null && !used.has(model.family))
	.sort((a, b) => b.tokens - a.tokens || a.price - b.price)
	.filter((model, index, all) => all.findIndex(other => other.family === model.family) === index)
	.slice(0, missing * 3);

if (json) {
	console.log(
		JSON.stringify(
			{ roster: rosterUrl, usageUpdatedAt: usage.updatedAt, ranked, seats: picks, backfill },
			null,
			2,
		),
	);
} else {
	console.log(`roster ${rosterUrl}`);
	console.log(`usage  ${USAGE_URL} (${usage.updatedAt ?? "unknown update time"})`);
	console.log("");
	console.log("rank\tid\t\t\t\tfamily\t\tcontext\t\ttokens7d");
	for (const [index, seat] of ranked.entries()) {
		const tokens = seat.tokens ? `${Math.round(seat.tokens / 1e11) / 10}T` : "unranked";
		console.log(`${index + 1}\t${seat.id}\t${familyOf(seat) ?? "-"}\t\t${seat.context}\t\t${tokens}`);
	}
	console.log("");
	console.log(
		`distinct families (${picks.length}/${seats}): ${picks.map(seat => `${seat.id} [${familyOf(seat)}]`).join(", ") || "none"}`,
	);
	for (const model of backfill) {
		console.log(
			`backfill candidate: ${model.id} [${model.family}] ${model.price}/M input, ${model.tokens ? Math.round(model.tokens / 1e11) / 10 : 0}T`,
		);
	}
	if (missing > 0 && backfill.length > 0) {
		console.log("probe candidates in order; take the first that answers and whose family differs from the parent chat");
	}
	if (missing > 0 && backfill.length === 0) {
		console.log(`still short ${missing}: name the collapse in the report`);
	}
}
