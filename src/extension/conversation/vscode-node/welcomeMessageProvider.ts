/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import * as vscode from 'vscode';
import { brandConfig } from '../../../brand/common/brandConfig';
import { agentNameForPrompts } from '../../../brand/common/promptIdentity';
import { getCachedUserDisplayNameSync, resolveUserDisplayName } from '../../../brand/common/userDisplayName';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { ServicesAccessor } from '../../../util/vs/platform/instantiation/common/instantiation';


export function getAdditionalWelcomeMessage(accessor: ServicesAccessor): vscode.MarkdownString | undefined {
	const configurationService = accessor.get(IConfigurationService);
	// Collect raw markdown segments and track commands that must be trusted so links are clickable.
	const segments: string[] = [];
	const enabledCommands = new Set<string>();

	// Internal (Microsoft) hint retained exactly, only shown when flag enabled
	if (configurationService.getConfig(ConfigKey.Internal.InternalWelcomeHintEnabled)) { // can only be true for internal users
		const openSettingsCommand = 'workbench.action.openSettings';
		enabledCommands.add(openSettingsCommand);
		const internalSegment = vscode.l10n.t({
			message: 'If handling customer data, [disable telemetry]({0}).',
			args: [`command:${openSettingsCommand}?${encodeURIComponent('["telemetry.telemetryLevel"]')}`],
			comment: ["{Locked=']({'}"]
		});
		segments.push(internalSegment);
	}

	// Brand-specific personalized welcome
	if (brandConfig.features.personalizedWelcome) {
		let userHandle: string | undefined;
		if (brandConfig.features.personalizedUserGreeting) {
			userHandle = getCachedUserDisplayNameSync(accessor);
			void resolveUserDisplayName(accessor); // async cache warm
		}
		const agentName = agentNameForPrompts();
		segments.push(
			userHandle
				? vscode.l10n.t(
					`Welcome back, **{0}**!\n\n This is {1} in {2}, your in-editor AI pair programmer. Select code for context, then ask for help fixing bugs, generating tests, refactoring, or explaining code. Use follow-up questions to iterate.`,
					userHandle,
					agentName,
					brandConfig.name,
				)
				: vscode.l10n.t(
					`Welcome to {0}!\n\n I'm {1}, your in-editor AI pair programmer. Open or select code to give me context, then ask for help fixing bugs, generating tests, refactoring, or explaining code. Use follow-up questions to iterate.`,
					brandConfig.name,
					agentName
				)
		);
		segments.push(
			vscode.l10n.t(
				`**Tips:**\n- Open the most relevant files and make a focused selection for precise answers.\n- Ask for alternatives or improvements ("optimize", "add tests", "make it more idiomatic").\n- Use inline chat for quick edits (select code, press Ctrl+I / Cmd+I).`
			)
		);

		if (brandConfig.features.welcomeTryPrompts) {
			const tryPrompts = [
				'Explain the architecture of this repository',
				'Generate unit tests for the selected function',
				'Identify potential performance bottlenecks in this file'
			];
			const chatCommand = 'workbench.action.chat.open';
			enabledCommands.add(chatCommand);
			const links = tryPrompts.map(p => `- [${p}](command:${chatCommand}?${encodeURIComponent(JSON.stringify({ query: p, isPartialQuery: false }))})`).join('\n');
			segments.push(vscode.l10n.t('**Try prompts:**\n{0}', links));
		}
	}

	if (!segments.length) {
		return undefined;
	}

	const composite = new vscode.MarkdownString(segments.join('\n\n'));
	if (enabledCommands.size) {
		composite.isTrusted = { enabledCommands: Array.from(enabledCommands) };
	}
	return composite;
}
