/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TSESLint } from '@typescript-eslint/utils';

const HEADER_LINES = [
    '/*---------------------------------------------------------------------------------------------',
    ' *  Copyright (c) Microsoft Corporation. All rights reserved.',
    ' *  Licensed under the MIT License. See License.txt in the project root for license information.',
    ' *--------------------------------------------------------------------------------------------*/'
];

const HEADER_BLOCK = HEADER_LINES.join('\n');

// Files we enforce (same as original plugin usage scope)
function shouldCheck(filename: string | undefined): boolean {
    if (!filename) { return false; }
    if (/node_modules\//.test(filename)) { return false; }
    if (/\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|md)$/i.test(filename)) { return false; }
    return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filename);
}

type MessageIds = 'missing' | 'mismatch';

const rule: any = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce standard file header banner',
            recommended: false
        },
        fixable: 'code',
        schema: [],
        messages: {
            missing: 'File is missing required license header.',
            mismatch: 'File header does not match required banner.'
        },
        defaultOptions: []
    },
    create(context: TSESLint.RuleContext<MessageIds, []>) {
        const filename = context.getFilename();
        if (!shouldCheck(filename)) {
            return {};
        }
        return {
            Program(node: any) {
                const source = context.getSourceCode();
                const text = source.getText();
                if (text.startsWith(HEADER_BLOCK + '\n') || text === HEADER_BLOCK) {
                    return; // OK
                }
                // See if there is any leading comment block
                const firstToken = source.getFirstToken(node);
                const before = text.slice(0, HEADER_BLOCK.length + 20); // sample
                const hasOldStyle = /Copyright \(c\) Microsoft Corporation/.test(before);
                const msgId: MessageIds = hasOldStyle ? 'mismatch' : 'missing';
                context.report({
                    node: firstToken || node,
                    messageId: msgId,
                    fix(fixer: TSESLint.RuleFixer) {
                        // Preserve shebang if present
                        const shebang = text.startsWith('#!') ? text.split('\n')[0] + '\n' : '';
                        const rest = shebang ? text.slice(shebang.length) : text;
                        // Remove any existing top block comment similar to header
                        const cleaned = rest.replace(/^\/\*[\s\S]*?\*\/\n?/, '');
                        const fixed = shebang + HEADER_BLOCK + '\n' + cleaned.replace(/^\n+/, '');
                        return fixer.replaceTextRange([0, text.length], fixed);
                    }
                });
            }
        };
    }
};

export default rule as TSESLint.RuleModule<MessageIds, []>;
