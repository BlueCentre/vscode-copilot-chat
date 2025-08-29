/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Lightweight, brand-layer helper to obtain a stable user display handle for personalized UI text.
// Intentionally isolated so upstream merges only need to keep this tiny file; no core service contracts changed.

import { IAuthenticationService } from '../../platform/authentication/common/authentication';
import { IOctoKitService } from '../../platform/github/common/githubService';
import { ServicesAccessor } from '../../util/vs/platform/instantiation/common/instantiation';

let cachedName: string | null | undefined; // undefined => not attempted, null => attempted none found

/** Synchronously return a cached user display name if already resolved or present in auth cache. */
export function getCachedUserDisplayNameSync(accessor: ServicesAccessor): string | undefined {
	if (cachedName !== undefined) {
		return cachedName === null ? undefined : cachedName;
	}
	// Attempt sync derivation from any cached GitHub session (no network)
	try {
		const auth = accessor.get(IAuthenticationService);
		const session = auth.anyGitHubSession;
		if (session?.account?.label) {
			cachedName = session.account.label;
			return cachedName;
		}
	} catch { /* ignore */ }
	return undefined;
}

/**
 * Resolve (possibly asynchronously) a short user handle suitable for greeting. Caches the result.
 * Only used if a future caller wants to upgrade from the sync fallback after registration.
 */
export async function resolveUserDisplayName(accessor: ServicesAccessor): Promise<string | undefined> {
	const existing = getCachedUserDisplayNameSync(accessor);
	if (existing) {
		return existing;
	}
	if (cachedName === null) {
		return undefined; // already attempted & failed
	}
	try {
		const octo = accessor.get(IOctoKitService);
		const gh = await octo.getCurrentAuthedUser();
		if (gh?.login) {
			cachedName = gh.login;
			return gh.login;
		}
	} catch { /* swallow */ }
	cachedName = null;
	return undefined;
}

/** Clear the cached resolved name (mainly for tests) */
export function __resetUserDisplayNameCache() { cachedName = undefined; }
