import { describe, expect, test } from "bun:test";
import { discoverEvidence } from "../scripts/discover.ts";

const FIX = new URL("./fixtures/work/", import.meta.url).pathname;

describe("discoverEvidence", () => {
	test("finds top-level and audit logs", () => {
		const manifest = discoverEvidence(FIX);
		const names = manifest.logs.map(log => log.path.split("/").pop()).sort();
		expect(names).toEqual(["decisions.tsv", "task-x.tsv"]);
		const top = manifest.logs.find(log => log.path.endsWith("decisions.tsv"))!;
		expect(top.rows.length).toBe(5);
	});

	test("finds feature maps in all three harness layouts", () => {
		const manifest = discoverEvidence(FIX);
		expect(manifest.featureMaps.map(fm => fm.skill).sort()).toEqual([
			"verify-api",
			"verify-app",
			"verify-web",
		]);
		const app = manifest.featureMaps.find(fm => fm.skill === "verify-app")!;
		expect(app.features.map(f => f.split("/").pop())).toEqual(["login.md"]);
	});

	test("classifies evidence pointers", () => {
		const manifest = discoverEvidence(FIX);
		const kinds = manifest.logs
			.find(log => log.path.endsWith("decisions.tsv"))!
			.rows.flatMap(row => row.evidence.map(e => e.kind));
		expect(kinds).toContain("sha");
		expect(kinds).toContain("pr");
		expect(kinds).toContain("file");
		expect(kinds).toContain("other");
	});

	test("warns on missing evidence, dedupes files", () => {
		const manifest = discoverEvidence(FIX);
		expect(manifest.warnings.some(w => w.includes("missing-file.txt"))).toBe(true);
		const names = manifest.evidenceFiles.map(f => f.split("/").pop()).sort();
		expect(names).toEqual([".env", "deploy.log", "shot.png", "tokens.txt"]);
		expect(new Set(manifest.evidenceFiles).size).toBe(manifest.evidenceFiles.length);
	});
});
