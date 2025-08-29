#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------
 *  Manifest branding overlay script (non-destructive).
 *  Applies lightweight branding changes without creating large diffs against upstream.
 *--------------------------------------------------------------------------------------------*/

const fs = require('fs');
const path = require('path');

function main() {
	const repoRoot = path.join(__dirname, '..', '..');
	const manifestPath = path.join(repoRoot, 'package.json');
	const original = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

	// Avoid re-applying if already branded
	if (original.displayName && original.displayName.startsWith('SWE Agent')) {
		return; // already applied
	}

	const overlay = {
		displayName: 'SWE Agent Chat',
		description: original.description?.replace(/Copilot/gi, 'SWE Agent') || 'AI chat features for software engineers',
		icon: 'assets/agent.png'
	};

	const merged = { ...original, ...overlay };

	fs.writeFileSync(manifestPath, JSON.stringify(merged, null, '\t') + '\n');
	console.log('[brand] Applied manifest overlay (displayName/icon/description).');
}

main();
