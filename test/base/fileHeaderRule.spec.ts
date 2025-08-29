/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import fs from 'fs';
import path from 'path';

const HEADER = `/*---------------------------------------------------------------------------------------------\n *  Copyright (c) Microsoft Corporation. All rights reserved.\n *  Licensed under the MIT License. See License.txt in the project root for license information.\n *--------------------------------------------------------------------------------------------*/`;

describe('local/file-header rule', () => {
	it('reports and fixes missing header', async () => {
		const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-header-'));
		const file = path.join(tmpDir, 'sample.ts');
		fs.writeFileSync(file, 'const x = 1;\n');
		const eslint = new ESLint({ fix: true });
		const [result] = await eslint.lintFiles([file]);
		expect(result.messages.some(m => m.ruleId === 'local/file-header')).toBe(true);
		if (result.output) {
			fs.writeFileSync(file, result.output);
		}
		const eslint2 = new ESLint({});
		const [result2] = await eslint2.lintFiles([file]);
		expect(result2.messages.some(m => m.ruleId === 'local/file-header')).toBe(false);
		const content = fs.readFileSync(file, 'utf8');
		expect(content.startsWith(HEADER)).toBe(true);
	});
});
