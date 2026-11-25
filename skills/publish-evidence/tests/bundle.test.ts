import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildBundle } from "../scripts/bundle.ts";
import { discoverEvidence } from "../scripts/discover.ts";

const FIX = new URL("./fixtures/work/", import.meta.url).pathname;
const OUT = new URL("./fixtures/out/", import.meta.url).pathname;

afterEach(() => {
	rmSync(OUT, { recursive: true, force: true });
});

describe("buildBundle", () => {
	test("stages index, redacts text, skips secrets, warns on binaries", () => {
		const manifest = discoverEvidence(FIX);
		const result = buildBundle(
			manifest,
			{ slug: "e2e", title: "[pstack] e2e evidence", description: "fixture bundle" },
			OUT,
		);
		expect(result.entrypoint).toBe("index.html");
		expect(existsSync(join(OUT, "index.html"))).toBe(true);

		const html = readFileSync(join(OUT, "index.html"), "utf8");
		expect(html).toContain("&lt;script&gt;");
		expect(html).not.toContain("<script>alert");

		// Denylisted names never reach the bundle…
		expect(result.skippedSecrets.some(f => f.endsWith(".env"))).toBe(true);
		expect(result.skippedSecrets.some(f => f.endsWith("tokens.txt"))).toBe(true);
		expect(existsSync(join(OUT, "files", "tokens.txt"))).toBe(false);

		// …while ordinary text evidence is staged redacted.
		expect(result.redactions.length).toBeGreaterThan(0);
		const stagedLog = readFileSync(join(OUT, "evidence", "deploy.log"), "utf8");
		expect(stagedLog).not.toContain("ghp_");
		expect(stagedLog).toContain("***REDACTED***");

		expect(result.warnings.some(w => w.includes("shot.png"))).toBe(true);
	});
});
