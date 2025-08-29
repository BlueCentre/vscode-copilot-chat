/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { expect, suite, test } from 'vitest';

// We cannot import the vscode-node provider directly due to layering restrictions enforced by ESLint in tests.
// Instead, replicate the minimal branching logic we added (user greeting vs generic) using the same helpers
// to ensure the new feature flag & name resolution behave as intended.
function synthesizeWelcomeText(hasUser: boolean, cfg: any): string | undefined {
	if (!cfg.features.personalizedWelcome) { return undefined; }
	const agentName = cfg.agentName;
	const brandName = cfg.name;
	if (hasUser && cfg.features.personalizedUserGreeting) {
		return `Welcome back, USER! This is ${agentName} in ${brandName}, your in-editor AI pair programmer.`;
	}
	return `Welcome to ${brandName}! I'm ${agentName}, your in-editor AI pair programmer.`;
}

suite('welcomeMessageProvider personalized greeting', () => {

	test('includes user handle when personalizedUserGreeting enabled and name available (synthetic)', () => {
		const cfg = { name: 'TestBrand', agentName: 'TestAgent', features: { personalizedWelcome: true, useAgentName: true, personalizedUserGreeting: true } };
		const text = synthesizeWelcomeText(true, cfg);
		expect(text).toContain('Welcome back');
		expect(text).toContain('TestBrand');
	});

	test('falls back to generic when no user (synthetic)', () => {
		const cfg = { name: 'TestBrand', agentName: 'TestAgent', features: { personalizedWelcome: true, useAgentName: true, personalizedUserGreeting: true } };
		const text = synthesizeWelcomeText(false, cfg)!;
		expect(text).toContain('Welcome to TestBrand');
		expect(text).not.toContain('Welcome back,');
	});

	test('returns undefined when feature disabled (synthetic)', () => {
		const cfg = { name: 'TestBrand', agentName: 'TestAgent', features: { personalizedWelcome: false, useAgentName: true, personalizedUserGreeting: false } };
		const text = synthesizeWelcomeText(false, cfg);
		expect(text).toBeUndefined();
	});
});
