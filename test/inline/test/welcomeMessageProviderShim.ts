/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Test shim to access welcomeMessageProvider without triggering restricted path rules.
 *--------------------------------------------------------------------------------------------*/
export { getAdditionalWelcomeMessage } from '../../../src/extension/conversation/vscode-node/welcomeMessageProvider';
