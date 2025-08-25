/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import * as l10n from '@vscode/l10n';
import * as vscode from 'vscode';
import { IAuthenticationService } from '../../../platform/authentication/common/authentication';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { ServicesAccessor } from '../../../util/vs/platform/instantiation/common/instantiation';


export function getAdditionalWelcomeMessage(accessor: ServicesAccessor): vscode.MarkdownString | undefined {
	const configurationService = accessor.get(IConfigurationService);
	const authService = accessor.get(IAuthenticationService);

	// Helper to encode a chat prompt for the workbench.action.chat.open command.
	const encodePrompt = (prompt: string) => encodeURIComponent(JSON.stringify([prompt]));

	// Sample prompts styled similarly to Gemini Code Assist (block-like clickable areas).
	// We make the entire prompt text the clickable link so the user can click anywhere in the rendered blockquote.
	const samplePrompts: string[] = [
		l10n.t('What does this repository do? Help me understand the architecture.'),
		l10n.t('Explain the open file focusing on exported functions and improvement opportunities.'),
		l10n.t('Add unit tests for the main exported function in the active file using the existing test framework.')
	];

	// Personalize if we already have an auth session; fall back to generic copy otherwise.
	const session = authService.anyGitHubSession; // synchronous, no network
	const userLabel = session?.account?.label?.trim();
	let value: string;
	if (!session) {
		// Unauthenticated user: encourage sign-in for personalization & full feature access.
		// Use existing command that triggers setup sign in flow. We intentionally keep wording succinct.
		const signInCommand = 'workbench.action.chat.triggerSetupForceSignIn';
		value = `**Welcome to Vitruvian SWE Agent**  \\
Sign in to unlock personalized assistance and full repository awareness.\n\n[Sign in](command:${signInCommand}) • or try a sample prompt first:\n\n`;
	} else {
		const greetingName = userLabel ? ', ' + userLabel : '';
		value = `**Welcome${greetingName}!**  \\
Your Vitruvian SWE Agent is ready. Ask anything about this codebase or start with a sample prompt below.\n\n`;
	}

	// Heading for the prompt section (mirrors Gemini wording)
	value += `**Prompts to try**\n\n`;

	// NOTE: We cannot (yet) render true Gemini-style out-of-Markdown prompt "chips" because that UI comes
	// from internal/proposed APIs for structured followups shown above the input box. For now we approximate
	// using a single‑column Markdown table so each prompt appears in its own bordered row in most themes.
	// NOTE: When VS Code exposes a public API for pre-input followup chips (e.g. ChatFollowupAction provider),
	// update this to emit structured followups instead of a Markdown table. (Tracking: GH-PLACEHOLDER)
	// (e.g. emit ChatFollowupAction items or sample prompts provider when VS Code exposes it to extensions).

	// Build table header (blank title just to get table structure) then each row with a codicon + link.
	const rows = samplePrompts.map(p => `| $(light-bulb) [${p}](command:workbench.action.chat.open?${encodePrompt(p)}) |`).join('\n');
	value += `|  |\n| - |\n${rows}`;

	// If internal hint is enabled, append the existing telemetry guidance.
	if (configurationService.getConfig(ConfigKey.Internal.InternalWelcomeHintEnabled)) { // can only be true for internal users
		const openSettingsCommand = 'workbench.action.openSettings';
		value += `\n\n---\n` + l10n.t({
			message: 'If handling customer data, [disable telemetry]({0}).',
			args: [`command:${openSettingsCommand}?${encodeURIComponent('["telemetry.telemetryLevel"]')}`],
			comment: ["{Locked=']({'}"]
		});
		const md = new vscode.MarkdownString(value);
		md.isTrusted = { enabledCommands: ['workbench.action.chat.open', openSettingsCommand, 'workbench.action.chat.triggerSetupForceSignIn'] };
		return md;
	}

	const md = new vscode.MarkdownString(value);
	// Trust the sign-in command only if we showed it (i.e. unauthenticated). Safe to always include.
	md.isTrusted = { enabledCommands: ['workbench.action.chat.open', 'workbench.action.chat.triggerSetupForceSignIn'] };
	return md;
}
