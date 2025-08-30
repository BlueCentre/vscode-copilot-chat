/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getAgentDisplayName } from './brandConfig';

// Returns the string that prompt system messages should use when referring to the agent's name.
// Upstream prompt files can be patched ONCE to import this instead of hard-coding.
export function agentNameForPrompts(): string {
	return getAgentDisplayName();
}
