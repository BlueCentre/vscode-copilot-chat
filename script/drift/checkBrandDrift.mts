#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Simple drift detector prototype: lists modified core files outside approved allowlist.
// Intended to be run against an updated upstream/main fetch.

const { execSync } = require('node:child_process');

const ALLOWLIST_PREFIXES = [
	'src/brand/',
	'src/extension/prompts/node/base/copilotIdentity.tsx', // intentionally patched once
	'src/extension/extension/vscode/extension.ts', // brand hook call
];

function run(cmd: string) { return execSync(cmd, { encoding: 'utf8' }).trim(); }

const base = process.argv[2] || 'origin/main';
const diffRaw = run(`git diff --name-only ${base}...HEAD`);
const files = diffRaw ? diffRaw.split('\n').filter(Boolean) : [];
/** @type {string[]} */
// @ts-ignore - JS tooling in TS repo
const offenders = files.filter((f /** @type {string} */) => !ALLOWLIST_PREFIXES.some(p => f.startsWith(p)) && !f.includes('brand/common'));

if (offenders.length) {
	console.error('Drift detector: found non-brand modifications:');
	/** @param {string} f */
	offenders.forEach((f) => console.error('  -', f));
	process.exitCode = 2;
} else {
	console.log('Drift detector: OK (only brand-layer modifications)');
}
