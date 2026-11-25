import { describe, expect, test } from "bun:test";
import { isDenied, redactText } from "../scripts/redact.ts";

describe("isDenied", () => {
	test("blocks secret-shaped basenames", () => {
		for (const name of [".env", ".env.local", "api-secret.json", "credentials.yml", "key.pem", "id_rsa", "auth-token.txt", "cookies.db"]) {
			expect(isDenied(`/work/x/${name}`)).toBe(true);
		}
	});

	test("allows ordinary files", () => {
		for (const name of ["shot.png", "trace.json", "decisions.tsv", "login.md"]) {
			expect(isDenied(`/work/x/${name}`)).toBe(false);
		}
	});
});

describe("redactText", () => {
	test("replaces token patterns and counts hits", () => {
		const { text, hits } = redactText("key ghp_123456789012345678901234567890123456 and AKIAIOSFODNN7EXAMPLE done");
		expect(text).not.toContain("ghp_");
		expect(text).not.toContain("AKIA");
		expect(text).toContain("***REDACTED***");
		expect(hits.reduce((n, h) => n + h.count, 0)).toBe(2);
	});

	test("leaves clean text untouched", () => {
		const { text, hits } = redactText("pixel-diff 0, tests green");
		expect(text).toBe("pixel-diff 0, tests green");
		expect(hits).toEqual([]);
	});
});
