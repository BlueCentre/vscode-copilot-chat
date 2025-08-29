/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Minimal indirection mapping for contributed tool names so rebranding doesn't require
// editing every usage of enums in core code. In future, upstream code can optionally adopt
// this indirection. For now we only re-express a subset we changed in the original rebrand.

// IMPORTANT: Only remap a very small allowlist of contributed tool IDs that are user-visible
// in UI surfaces (eg. tool palette) so tests relying on package.json contributed IDs do not break.
// Broadly rewriting every `copilot_` prefix to `agent_` caused test failures when the packaged
// extension manifest (package.json) still declares the original IDs. We therefore maintain
// a conservative mapping list. Add new entries here only if the package.json is updated to match
// or tests are adjusted accordingly.

const ALLOWLIST_REMAP: Record<string, string> = Object.freeze({
	// Example: 'copilot_exampleTool': 'agent_exampleTool'
});

export function mapContributedToolId(id: string): string {
	return ALLOWLIST_REMAP[id] ?? id;
}
