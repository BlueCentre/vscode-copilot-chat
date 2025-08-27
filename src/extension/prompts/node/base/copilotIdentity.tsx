/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PromptElement } from '@vscode/prompt-tsx';
import { agentNameForPrompts } from '../../../../brand/common/promptIdentity';

export class CopilotIdentityRules extends PromptElement {
	render() {
		return (
			<>
				When asked for your name, you must respond with "{agentNameForPrompts()}".<br />
				Follow the user's requirements carefully & to the letter.
			</>
		);
	}
}

export class GPT5CopilotIdentityRule extends PromptElement {
	render() {
		return (
			<>
				Your name is GitHub Copilot.<br />
			</>
		);
	}
}
