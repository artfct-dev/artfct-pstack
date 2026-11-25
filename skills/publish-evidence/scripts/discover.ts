import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export type EvidenceKind = "file" | "sha" | "pr" | "other" | "empty";

export interface EvidenceRef {
	raw: string;
	kind: EvidenceKind;
	/** Absolute path, only when kind === "file". */
	path?: string;
}

export interface LogRow {
	ts: string;
	phase: string;
	decision: string;
	why: string;
	evidence: EvidenceRef[];
	result: string;
}

export interface FoundLog {
	path: string;
	rows: LogRow[];
}

export interface FeatureMap {
	skillDir: string;
	skill: string;
	features: string[];
}

export interface Manifest {
	root: string;
	logs: FoundLog[];
	featureMaps: FeatureMap[];
	/** Absolute paths of evidence files (pre-redaction; redact.ts filters). */
	evidenceFiles: string[];
	warnings: string[];
}

const SKILL_ROOTS = [".cursor/skills", ".claude/skills", ".omp/skills"];
const TSV_COLUMNS = 6;

const SHA_RE = /^(?:commit(?: SHA)?|sha)\s+[0-9a-f]{4,40}$/i;
const PR_RE = /^(?:PR|pr|#)\s*\d+$/;

function splitEvidenceCell(cell: string): string[] {
	return cell
		.split(/,|\band\b/gi)
		.map((part: string) => part.trim().replace(/^["']|["']$/g, ""))
		.filter((part: string) => part.length > 0);
}

function classifyEvidence(raw: string, root: string, warnings: string[]): EvidenceRef {
	if (SHA_RE.test(raw)) return { raw, kind: "sha" };
	if (PR_RE.test(raw) || /\/pull\/\d+/.test(raw)) return { raw, kind: "pr" };
	// Strip common wrappers: "file:line", trailing slashes, parentheticals.
	const candidate = raw
		.replace(/\s*\(.*\)\s*$/, "")
		.replace(/:\d+(?::\d+)?$/, "")
		.replace(/\/$/, "");
	const abs = resolve(root, candidate);
	if (existsSync(abs)) return { raw, kind: "file", path: abs };
	warnings.push(`evidence pointer not found on disk: ${raw}`);
	return { raw, kind: "other" };
}

function parseTsv(path: string, root: string, warnings: string[]): LogRow[] {
	const text = readFileSync(path, "utf8");
	const lines = text.split("\n").filter((line: string) => line.trim().length > 0);
	if (lines.length === 0) return [];
	const start = lines[0].toLowerCase().startsWith("ts\t") ? 1 : 0;
	const rows: LogRow[] = [];
	for (const line of lines.slice(start)) {
		const cells = line.split("\t");
		while (cells.length < TSV_COLUMNS) cells.push("");
		const [ts, phase, decision, why, evidenceCell, result] = cells;
		const evidence = splitEvidenceCell(evidenceCell).map((raw: string) =>
			classifyEvidence(raw, root, warnings),
		);
		rows.push({ ts, phase, decision, why, evidence, result });
	}
	return rows;
}

function findLogs(root: string): { path: string }[] {
	const found: { path: string }[] = [];
	const top = join(root, "decisions.tsv");
	if (existsSync(top) && statSync(top).isFile()) found.push({ path: top });
	const audit = join(root, ".audit");
	if (existsSync(audit) && statSync(audit).isDirectory()) {
		for (const entry of readdirSync(audit).sort()) {
			if (!entry.endsWith(".tsv")) continue;
			const full = join(audit, entry);
			if (statSync(full).isFile()) found.push({ path: full });
		}
	}
	return found;
}

function findFeatureMaps(root: string): FeatureMap[] {
	const maps: FeatureMap[] = [];
	for (const skillsDir of SKILL_ROOTS) {
		const abs = join(root, skillsDir);
		if (!existsSync(abs) || !statSync(abs).isDirectory()) continue;
		for (const entry of readdirSync(abs).sort()) {
			if (!entry.startsWith("verify-")) continue;
			const skillDir = join(abs, entry);
			if (!statSync(skillDir).isDirectory()) continue;
			const features: string[] = [];
			const featuresDir = join(skillDir, "features");
			if (existsSync(featuresDir) && statSync(featuresDir).isDirectory()) {
				for (const file of readdirSync(featuresDir).sort()) {
					const full = join(featuresDir, file);
					if (statSync(full).isFile()) features.push(full);
				}
			}
			maps.push({ skillDir, skill: entry, features });
		}
	}
	return maps;
}

/** Discover decision logs, feature maps, and evidence files under root. Paths in the manifest are absolute. */
export function discoverEvidence(rootDir: string): Manifest {
	const root = resolve(rootDir);
	const warnings: string[] = [];
	const logs: FoundLog[] = findLogs(root).map(({ path }) => ({
		path,
		rows: parseTsv(path, root, warnings),
	}));
	const featureMaps = findFeatureMaps(root);
	const seen = new Set<string>();
	const evidenceFiles: string[] = [];
	for (const log of logs) {
		for (const row of log.rows) {
			for (const ref of row.evidence) {
				if (ref.kind === "file" && ref.path && !seen.has(ref.path)) {
					seen.add(ref.path);
					evidenceFiles.push(ref.path);
				}
			}
		}
	}
	return { root, logs, featureMaps, evidenceFiles, warnings };
}

const isMain = typeof process !== "undefined" && (process.argv[1] ?? "").endsWith("discover.ts");
if (isMain) {
	const rootFlag = process.argv.indexOf("--root");
	const root = rootFlag >= 0 ? process.argv[rootFlag + 1] : ".";
	console.log(JSON.stringify(discoverEvidence(root), null, 2));
}
