#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const { execSync } = require('node:child_process');

const ALLOWLIST_PREFIXES = [
	'src/brand/',
	'src/extension/prompts/node/base/copilotIdentity.tsx',
	'src/extension/extension/vscode/extension.ts',
];

function run(cmd) { return execSync(cmd, { encoding: 'utf8' }).trim(); }

const base = process.argv[2] || 'origin/main';
const diffRaw = run(`git diff --name-only ${base}...HEAD`);
const files = diffRaw ? diffRaw.split('\n').filter(Boolean) : [];
const offenders = files.filter(f => !ALLOWLIST_PREFIXES.some(p => f.startsWith(p)) && !f.includes('brand/common'));

if (offenders.length) {
	console.error('Drift detector: found non-brand modifications:');
	for (const f of offenders) {
		console.error('  -', f);
	}
	process.exitCode = 2;
} else {
	console.log('Drift detector: OK (only brand-layer modifications)');
}
