/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Branding and feature toggle configuration for the rebranded fork.
// Centralizes rebrand surface so upstream merges only need to keep a tiny indirection.

export interface IBrandFeatures {
	readonly personalizedWelcome: boolean;
	readonly useAgentName: boolean; // swap "GitHub Copilot" => custom agent name in prompts
	readonly personalizedUserGreeting: boolean; // show user's authenticated handle in welcome if available
	readonly welcomeTryPrompts?: boolean; // show clickable sample prompts in welcome
}

export interface IBrandConfig {
	readonly name: string;        // Human readable brand name
	readonly agentName: string;   // Name the model should answer with
	readonly icon: string;        // Default extension icon path (relative to extension root)
	readonly features: IBrandFeatures;
}

export const brandConfig: IBrandConfig = {
	name: 'SWE Agent Chat',
	agentName: 'SWE Agent',
	icon: 'assets/agent.png',
	features: {
		personalizedWelcome: true,
		useAgentName: true,
		personalizedUserGreeting: true,
		welcomeTryPrompts: true,
	},
};

export const getAgentDisplayName = (): string => brandConfig.agentName;
