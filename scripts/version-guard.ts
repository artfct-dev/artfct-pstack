#!/usr/bin/env bun
// Fails when a branch changes the released surface without bumping the
// version in plugin.json and package.json. OMP's plugin upgrade treats an
// unchanged version as "nothing new" and reinstalls the old commit, so a
// merged skill fix that skipped the bump never reaches an installed plugin.
//
// Usage: bun scripts/version-guard.ts [base-ref]   (default: origin/main)

const base = process.argv[2] ?? "origin/main";
const SURFACE = /^(skills|agents|src)\/|^plugin\.json$/;

function fail(message: string): never {
	console.error(`version guard: ${message}`);
	process.exit(1);
}

async function git(...args: string[]): Promise<string> {
	const proc = Bun.spawn(["git", ...args], { stdout: "pipe", stderr: "pipe" });
	const [out, err, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (code !== 0) fail(`git ${args.join(" ")} failed: ${err.trim()}`);
	return out;
}

async function versions(ref?: string): Promise<{ plugin: string; pkg: string }> {
	const read = async (file: string) =>
		JSON.parse(ref ? await git("show", `${ref}:${file}`) : await Bun.file(file).text());
	const [plugin, pkg] = await Promise.all([read("plugin.json"), read("package.json")]);
	return { plugin: plugin.version, pkg: pkg.version };
}

const tracked = (await git("diff", "--name-only", base)).split("\n").filter(Boolean);
const untracked = (await git("ls-files", "--others", "--exclude-standard")).split("\n").filter(Boolean);
const surface = [...new Set([...tracked, ...untracked])].filter(file => SURFACE.test(file));

const head = await versions();
if (head.plugin !== head.pkg) {
	fail(`plugin.json (${head.plugin}) and package.json (${head.pkg}) disagree`);
}

if (surface.length === 0) {
	console.log(`version guard: no release-surface change vs ${base}; skipped`);
	process.exit(0);
}

const before = await versions(base);
if (before.plugin === head.plugin) {
	const list = surface.map(file => `  ${file}`).join("\n");
	fail(
		`release surface changed but version is still ${head.plugin}.\n` +
			`Bump it in this PR: bun scripts/bump-version.ts patch\n\n${list}`,
	);
}

console.log(`version guard: ${before.plugin} -> ${head.plugin} covers ${surface.length} release file(s)`);

export {};
