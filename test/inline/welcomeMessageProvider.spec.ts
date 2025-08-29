/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Test: personalized welcome message includes user greeting when feature flags enabled.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as brandCfg from '../../src/brand/common/brandConfig';
import * as userNameMod from '../../src/brand/common/userDisplayName';
import { getAdditionalWelcomeMessage } from '../../src/extension/conversation/vscode-node/welcomeMessageProvider';

// Minimal mock accessor: only needs to satisfy get(IConfigurationService) usage; we bypass by returning object with getConfig always false.
class MockConfigService { getConfig() { return false; } }

// ServicesAccessor mimic
const mockAccessor: any = {
	get: (svc: any) => {
		if (svc?.toString?.().includes('ConfigurationService')) {
			return new MockConfigService();
		}
		throw new Error('Unexpected service request in test');
	}
};

describe('welcomeMessageProvider personalized greeting', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('includes user handle when personalizedUserGreeting enabled and name available', async () => {
		vi.spyOn(brandCfg, 'brandConfig', 'get').mockReturnValue({
			name: 'TestBrand',
			agentName: 'TestAgent',
			icon: 'assets/icon.png',
			features: { personalizedWelcome: true, useAgentName: true, personalizedUserGreeting: true }
		} as any);
		vi.spyOn(userNameMod, 'getCachedUserDisplayNameSync').mockReturnValue('octocat');
		const md = getAdditionalWelcomeMessage(mockAccessor);
		expect(md?.value || md?.toString() || '').toContain('octocat');
		expect(md?.value || md?.toString() || '').toContain('Welcome back');
	});

	it('falls back to generic when no user', () => {
		vi.spyOn(brandCfg, 'brandConfig', 'get').mockReturnValue({
			name: 'TestBrand',
			agentName: 'TestAgent',
			icon: 'assets/icon.png',
			features: { personalizedWelcome: true, useAgentName: true, personalizedUserGreeting: true }
		} as any);
		vi.spyOn(userNameMod, 'getCachedUserDisplayNameSync').mockReturnValue(undefined);
		const md = getAdditionalWelcomeMessage(mockAccessor);
		const text = md?.value || md?.toString() || '';
		expect(text).toContain('Welcome to TestBrand');
		expect(text).not.toContain('Welcome back,');
	});

	it('returns undefined when no segments and feature disabled', () => {
		vi.spyOn(brandCfg, 'brandConfig', 'get').mockReturnValue({
			name: 'TestBrand',
			agentName: 'TestAgent',
			icon: 'assets/icon.png',
			features: { personalizedWelcome: false, useAgentName: true, personalizedUserGreeting: false }
		} as any);
		const md = getAdditionalWelcomeMessage(mockAccessor);
		expect(md).toBeUndefined();
	});
});
