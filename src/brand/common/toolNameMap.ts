/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Minimal indirection mapping for contributed tool names so rebranding doesn't require
// editing every usage of enums in core code. In future, upstream code can optionally adopt
// this indirection. For now we only re-express a subset we changed in the original rebrand.

// For now, we replicate the mapping pattern: upstream "copilot_*" -> brand "agent_*".

export function mapContributedToolId(id: string): string {
	if (id.startsWith('copilot_')) {
		return id.replace(/^copilot_/, 'agent_');
	}
	return id;
}
