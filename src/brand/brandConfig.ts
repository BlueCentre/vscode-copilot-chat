/*
 * Branding and feature toggle configuration for Vitruvian SWE Agent fork.
 * Centralizes rebrand surface so upstream merges only need to keep a tiny indirection.
 */

export interface BrandFeatures {
	personalizedWelcome: boolean;
	useAgentName: boolean; // swap "GitHub Copilot" => custom agent name in prompts
}

export interface BrandConfig {
	name: string;               // Human readable brand name
	agentName: string;          // Name the model should answer with
	icon: string;               // Default extension icon path (relative to extension root)
	features: BrandFeatures;
}

export const brand: BrandConfig = {
	name: 'SWE Agent Chat',
	agentName: 'SWE Agent',
	icon: 'assets/agent.png',
	features: {
		personalizedWelcome: true,
		useAgentName: true,
	},
};

export const getAgentDisplayName = () => brand.agentName;
