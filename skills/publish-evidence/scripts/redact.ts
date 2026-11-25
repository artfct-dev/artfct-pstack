import { basename } from "node:path";

/** Basename-level denylist: never publish these, report them as skipped. */
const DENIED_BASENAMES = [
	/^\.env(\..*)?$/i,
	/secret/i,
	/credential/i,
	/\.(pem|key)$/i,
	/(^|[_.-])id_rsa/i,
	/token/i,
	/cookies?/i,
];

export function isDenied(filePath: string): boolean {
	return DENIED_BASENAMES.some(re => re.test(basename(filePath)));
}

const CONTENT_PATTERNS: { name: string; re: RegExp }[] = [
	{ name: "aws-access-key", re: /AKIA[0-9A-Z]{16}/g },
	{ name: "aws-secret-key", re: /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{20,}/gi },
	{ name: "github-token", re: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g },
	{ name: "github-fine-token", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
	{ name: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]+\b/g },
	{ name: "private-key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
	{ name: "bearer-token", re: /\bBearer\s+[A-Za-z0-9\-._~+/=]{20,}\b/g },
];

export interface Redaction {
	text: string;
	hits: { pattern: string; count: number }[];
}

/** Replace token-shaped content with ***REDACTED***; report per-pattern hits. */
export function redactText(input: string): Redaction {
	let text = input;
	const hits: { pattern: string; count: number }[] = [];
	for (const { name, re } of CONTENT_PATTERNS) {
		re.lastIndex = 0;
		let count = 0;
		text = text.replace(re, () => {
			count += 1;
			return "***REDACTED***";
		});
		if (count > 0) hits.push({ pattern: name, count });
	}
	return { text, hits };
}
