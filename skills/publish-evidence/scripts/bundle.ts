import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { Manifest } from "./discover.js";
import { isDenied, redactText } from "./redact.js";

export interface BundleMeta {
	slug: string;
	title: string;
	description: string;
}

export interface BundleResult {
	entrypoint: string;
	files: string[];
	skippedSecrets: string[];
	redactions: { file: string; pattern: string; count: number }[];
	warnings: string[];
}

function esc(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function isProbablyText(path: string): boolean {
	return /\.(md|markdown|txt|tsv|csv|json|jsonl|log|html|xml|yaml|yml|diff|patch)$/i.test(path);
}

function renderIndex(manifest: Manifest, meta: BundleMeta, included: { label: string; href: string }[]): string {
	const logTables = manifest.logs
		.map(log => {
			const rows = log.rows
				.map(
					row =>
						`<tr><td>${esc(row.ts)}</td><td>${esc(row.phase)}</td><td>${esc(row.decision)}</td><td>${esc(row.why)}</td><td>${esc(row.evidence.map(e => e.raw).join("; "))}</td><td>${esc(row.result)}</td></tr>`,
				)
				.join("\n");
			return `<h2>Log: ${esc(relative(manifest.root, log.path))} (${log.rows.length} rows)</h2>\n<table><thead><tr><th>ts</th><th>phase</th><th>decision</th><th>why</th><th>evidence</th><th>result</th></tr></thead><tbody>\n${rows}\n</tbody></table>`;
		})
		.join("\n");
	const featureSections = manifest.featureMaps
		.map(
			fm =>
				`<h2>Feature map: ${esc(fm.skill)}</h2>\n<ul>\n${fm.features.map(f => `<li>${esc(relative(manifest.root, f))}</li>`).join("\n")}\n</ul>`,
		)
		.join("\n");
	const evidenceLinks = included
		.map(item => `<li><a href="${esc(item.href)}">${esc(item.label)}</a></li>`)
		.join("\n");
	return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${esc(meta.title)}</title></head>
<body>
<h1>${esc(meta.title)}</h1>
<p>${esc(meta.description)}</p>
<h2>Evidence files</h2>
<ul>
${evidenceLinks}
</ul>
${logTables}
${featureSections}
</body>
</html>
`;
}

/**
 * Copy manifest files into outDir: denylisted names are skipped and reported,
 * text is redacted, anything else ships as-is with a warning.
 * See the skill doc: binaries ship after the denylist, with a warning that
 * terminal screenshots can leak tokens.
 */
export function buildBundle(manifest: Manifest, meta: BundleMeta, outDir: string): BundleResult {
	mkdirSync(outDir, { recursive: true });
	const files: string[] = [];
	const skippedSecrets: string[] = [];
	const redactions: BundleResult["redactions"] = [];
	const warnings = [...manifest.warnings];
	const included: { label: string; href: string }[] = [];

	/** Stage one file under outDir/subDir, preserving its root-relative path (evidence uses its basename). */
	const stage = (absPath: string, subDir: string, flat: boolean) => {
		const rel = relative(manifest.root, absPath);
		if (isDenied(absPath)) {
			skippedSecrets.push(rel);
			return;
		}
		const dest = flat ? join(outDir, subDir, basename(absPath)) : join(outDir, subDir, rel);
		mkdirSync(join(dest, ".."), { recursive: true });
		if (isProbablyText(absPath)) {
			const { text, hits } = redactText(readFileSync(absPath, "utf8"));
			writeFileSync(dest, text);
			for (const hit of hits) redactions.push({ file: rel, ...hit });
		} else {
			copyFileSync(absPath, dest);
			warnings.push(`binary shipped as-is (content not scanned): ${rel}`);
		}
		const href = flat ? join(subDir, basename(absPath)) : join(subDir, rel);
		files.push(href);
		included.push({ label: flat ? `evidence: ${basename(absPath)}` : rel, href });
	};

	for (const log of manifest.logs) stage(log.path, "files", false);
	for (const fm of manifest.featureMaps) {
		const skillMd = join(fm.skillDir, "SKILL.md");
		try {
			stage(skillMd, "files", false);
		} catch {
			warnings.push(`feature map SKILL.md unreadable: ${relative(manifest.root, skillMd)}`);
		}
		for (const feature of fm.features) stage(feature, "files", false);
	}
	for (const evidence of manifest.evidenceFiles) stage(evidence, "evidence", true);

	writeFileSync(join(outDir, "index.html"), renderIndex(manifest, meta, included));
	files.unshift("index.html");
	return { entrypoint: "index.html", files, skippedSecrets, redactions, warnings };
}
