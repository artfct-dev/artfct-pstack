#!/usr/bin/env bun
// Bumps the version in plugin.json and package.json in lockstep.
// Usage: bun scripts/bump-version.ts [patch|minor|major]   (default: patch)

const kind = process.argv[2] ?? "patch";
if (!["patch", "minor", "major"].includes(kind)) {
	throw new Error(`unknown bump kind "${kind}"; use patch, minor, or major`);
}

const current: string = JSON.parse(await Bun.file("plugin.json").text()).version;
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
if (!match) throw new Error(`plugin.json version "${current}" is not x.y.z`);

let [major, minor, patch] = match.slice(1).map(Number);
if (kind === "major") major += 1;
if (kind === "minor") minor += 1;
if (kind === "patch") patch += 1;
const next = `${major}.${minor}.${patch}`;

for (const file of ["plugin.json", "package.json"]) {
	const source = await Bun.file(file).text();
	const updated = source.replace(/"version":\s*"[^"]*"/, `"version": "${next}"`);
	if (updated === source) throw new Error(`no version field found in ${file}`);
	await Bun.write(file, updated);
}

console.log(`bumped ${current} -> ${next} (plugin.json, package.json)`);

export {};
