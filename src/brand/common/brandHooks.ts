/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IInstantiationService } from '../../util/vs/platform/instantiation/common/instantiation';
import { brandConfig } from './brandConfig';

// Future: register prompt augmentors, participants, etc. For now exports minimal API.

export function registerBrandArtifacts(_instantiationService: IInstantiationService): void {
	// Intentionally minimal now; placeholder for future brand-specific registrations.
	// Keeping this function ensures only one upstream file needs a single-line patch.
}

export function getBrandConfig() { return brandConfig; }
