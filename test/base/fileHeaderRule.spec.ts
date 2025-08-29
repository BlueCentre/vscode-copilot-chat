/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import path from 'path';
import { describe, expect, it } from 'vitest';
// We'll unit test the rule directly rather than driving the full ESLint engine, since
// flat config layering + plugin resolution inside the repository was making the
// integration-style test brittle and the rule itself is pure on the provided SourceCode text.
// Import the rule directly (CommonJS require since rule file compiled via tsx at runtime)
const fileHeaderRule = require('../../.eslintplugin/file-header.ts').default;

const HEADER = `/*---------------------------------------------------------------------------------------------\n *  Copyright (c) Microsoft Corporation. All rights reserved.\n *  Licensed under the MIT License. See License.txt in the project root for license information.\n *--------------------------------------------------------------------------------------------*/`;

describe('local/file-header rule', () => {
	it('reports and fixes missing header', async () => {
		const code = 'const x = 1;\n';
		const filename = path.join(process.cwd(), 'sample-direct.ts');
		// Minimal harness replicating core parts of ESLint RuleContext / SourceCode we rely on.
		const messages: any[] = [];
		let currentText = code;
		const fakeSourceCode = {
			getText: () => currentText,
			getFirstToken: () => null
		};
		const fixerApplies: Array<[number, number, string]> = [];
		const context: any = {
			getFilename: () => filename,
			getSourceCode: () => fakeSourceCode,
			report: (descriptor: any) => {
				messages.push(descriptor);
				if (descriptor.fix) {
					descriptor.fix({
						replaceTextRange(range: [number, number], text: string) {
							fixerApplies.push([range[0], range[1], text]);
							return null as any; // ESLint ignores the actual return in our harness
						}
					} as any);
					// Some fixers may return nothing or array; we rely on captured replaceTextRange above.
				}
			}
		};
		const listeners = fileHeaderRule.create(context);
		// Invoke Program listener manually
		listeners.Program && listeners.Program({ type: 'Program' });
		expect(messages.length).toBe(1);
		expect(messages[0].messageId === 'missing' || messages[0].messageId === 'mismatch').toBe(true);
		// Apply accumulated fixer edits (single full replacement expected)
		for (const [, end, text] of fixerApplies) {
			currentText = text + currentText.slice(end); // full replacement
		}
		expect(currentText.startsWith(HEADER)).toBe(true);
		// Re-run rule on fixed content; should produce no messages.
		messages.length = 0;
		fixerApplies.length = 0;
		listeners.Program && listeners.Program({ type: 'Program' });
		expect(messages.length).toBe(0);
	});
});
