/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// NOTE: This helper introduces a light-weight, opt-in namespacing layer for any IDs we register
// with VS Code (commands, chat participants, tools, comment controllers, tree views, etc.).
//
// Goals:
// 1. Keep upstream diffs minimal while we are still acting as a drop-in replacement.
// 2. Allow an easy flip to side-by-side mode (fork + upstream both installed) without doing a
//    broad mechanical refactor later.
// 3. Provide a single, documented place to reason about and test ID behavior.
//
// Strategy:
// - While the extension identifier (publisher.name) matches the upstream ID we return original
//   local IDs (un-namespaced) to avoid churn in command IDs, tests, telemetry event names, etc.
// - Once the fork changes its extension identifier, every new registration that adopts this helper
//   can automatically produce a fully-qualified, globally unique ID using the extension ID as a
//   namespace prefix.
// - A developer can force namespaced behavior early (even when still using the upstream ID) by
//   setting the env var COPILOT_FORK_NAMESPACE_STRICT=1 to smoke-test future divergence.
//
// Adoption Pattern:
//   import { maybeNamespacedId } from '../brand/IdNamespace';
//   const COMMAND_ID = maybeNamespacedId('myFeature.doThing');
//   vscode.commands.registerCommand(COMMAND_ID, ...);
//
// Later, after changing the extension identifier in package.json, callers automatically receive
// unique IDs without touching each call site.

import * as vscode from 'vscode';

/** Upstream (original) extension identifier. Case-insensitive but we preserve canonical form. */
export const UPSTREAM_EXTENSION_ID = 'GitHub.copilot-chat';

// Internal cached ID for the *current* running instance (fork or upstream). We allow it to be
// initialized explicitly from the extension activation function for accuracy, but we also lazily
// fall back to best-effort detection if initializeNamespace() wasn't invoked yet.
let currentExtensionId: string | undefined;

/**
 * Call once during activation (recommended) to precisely capture our extension id.
 * Example (in activate):
 *   initializeNamespace(context.extension.id);
 */
export const initializeNamespace = (id: string): void => {
	currentExtensionId = id;
};

/** Resolve the active extension identifier (fork or upstream). */
export const getExtensionNamespace = (): string => {
	if (currentExtensionId) {
		return currentExtensionId;
	}
	// Lazy fallback: attempt to find upstream; if we're a fork with a new id and activation hasn't
	// set us yet, we can try to locate any extension whose exports match expected shape. For now we
	// keep it simple and just return upstream if present.
	const upstream = vscode.extensions.getExtension(UPSTREAM_EXTENSION_ID);
	if (upstream) {
		return upstream.id; // normalizes any casing
	}
	return UPSTREAM_EXTENSION_ID; // final fallback
};

/** True if we are still using the upstream extension identifier (i.e. acting as a drop-in). */
export const isUsingUpstreamId = (): boolean => {
	const ns = getExtensionNamespace().toLowerCase();
	return ns === UPSTREAM_EXTENSION_ID.toLowerCase();
};

/** Environment variable gate to force namespacing even before we diverge the extension id. */
const STRICT_NAMESPACE = process.env.COPILOT_FORK_NAMESPACE_STRICT === '1';

/** Always create a fully-qualified id using the current extension id as a namespace prefix. */
export const makeExtensionScopedId = (local: string): string => {
	return `${getExtensionNamespace()}.${local}`;
};

/**
 * Produce an ID suitable for registering VS Code contributions.
 *
 * Behavior:
 * - If we are still using the upstream ID AND strict mode is off, return the provided local id
 *   unchanged (preserves original identifiers; minimal diff / churn).
 * - Otherwise, prefix the local id with the (possibly forked) extension id.
 *
 * This ensures consumers can adopt this helper *before* forking identifiers, gaining an effortless
 * future switch to side-by-side safety.
 */
export const maybeNamespacedId = (local: string): string => {
	if (!STRICT_NAMESPACE && isUsingUpstreamId()) {
		return local; // preserve original
	}
	return makeExtensionScopedId(local);
};

/** Convenience: derive a telemetry event name using the same namespacing decision. */
export const maybeNamespacedEvent = (event: string): string => maybeNamespacedId(event);

/** Convenience: derive an output channel or controller label (namespacing optional). */
export const maybeNamespacedLabel = (label: string): string => {
	// Labels are user-visible; we often *don't* want raw extension id prefixes. Provide a hook in case
	// downstream wants to differentiate (enable via env var COPILOT_FORK_NAMESPACE_LABELS=1).
	if (process.env.COPILOT_FORK_NAMESPACE_LABELS === '1' && (STRICT_NAMESPACE || !isUsingUpstreamId())) {
		return `[${getExtensionNamespace()}] ${label}`;
	}
	return label;
};

/** Export shape summary for easier testability and future refactors. */
export const _debug = {
	getExtensionNamespace,
	isUsingUpstreamId,
	STRICT_NAMESPACE,
};
