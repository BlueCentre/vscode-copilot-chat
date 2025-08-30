/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Lightweight opt-in namespacing for IDs we register with VS Code (commands, chat participants,
// tools, comment controllers, etc.). See doc comments below for strategy and adoption guidance.

import type * as vscode from 'vscode';

/**
 * Upstream (original) extension identifier. When our fork still uses this same identifier we
 * operate in "compat mode" (no namespacing) unless forced via COPILOT_FORK_NAMESPACE_STRICT=1.
 */
export const UPSTREAM_EXTENSION_ID = 'GitHub.copilot-chat';

let currentExtensionId: string | undefined; // set during activation, else lazily inferred

/** Initialize the namespace layer explicitly (recommended during activate()). */
export const initializeNamespace = (id: string): void => {
	currentExtensionId = id;
};

/** Resolve the active extension identifier (fork or upstream). */
export const getExtensionNamespace = (): string => {
	if (currentExtensionId) {
		return currentExtensionId;
	}
	// Dynamically require to avoid bundling issues & comply with type-only import rule.
	const vs: typeof vscode | undefined = require('vscode');
	const upstream = vs?.extensions.getExtension(UPSTREAM_EXTENSION_ID);
	if (upstream) {
		return upstream.id; // normalized
	}
	return UPSTREAM_EXTENSION_ID; // fallback
};

/** True if we are still using the upstream extension identifier (drop-in replacement mode). */
export const isUsingUpstreamId = (): boolean => {
	return getExtensionNamespace().toLowerCase() === UPSTREAM_EXTENSION_ID.toLowerCase();
};

/** Environment variable gate to force namespacing even before divergence. */
const STRICT_NAMESPACE = process.env.COPILOT_FORK_NAMESPACE_STRICT === '1';

/** Always produce a fully-qualified id using the extension id as a prefix. */
export const makeExtensionScopedId = (local: string): string => `${getExtensionNamespace()}.${local}`;

/**
 * Produce an ID suitable for registering VS Code contributions.
 * - If still using upstream ID AND not forcing strict, return local (minimal diffs / churn).
 * - Otherwise prefix with extension id for global uniqueness.
 */
export const maybeNamespacedId = (local: string): string => {
	if (!STRICT_NAMESPACE && isUsingUpstreamId()) {
		return local;
	}
	return makeExtensionScopedId(local);
};

/** Convenience wrappers mirroring maybeNamespacedId semantics. */
export const maybeNamespacedEvent = (event: string): string => maybeNamespacedId(event);

export const maybeNamespacedLabel = (label: string): string => {
	if (process.env.COPILOT_FORK_NAMESPACE_LABELS === '1' && (STRICT_NAMESPACE || !isUsingUpstreamId())) {
		return `[${getExtensionNamespace()}] ${label}`;
	}
	return label;
};

/** Export internals for test visibility. */
export const _debug = { getExtensionNamespace, isUsingUpstreamId, STRICT_NAMESPACE };
