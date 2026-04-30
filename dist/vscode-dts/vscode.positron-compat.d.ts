/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2026 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

declare module 'vscode' {

	/**
	 * Compatibility shape for proposed Positron language model APIs that depend
	 * on declarations not yet present in the package's @types/vscode peer range.
	 */
	export interface LanguageModelDataPart {
		readonly mimeType: string;
		readonly data: Uint8Array;
	}

	/**
	 * Provider-facing language model chat message shape used by proposed APIs.
	 */
	export interface LanguageModelChatRequestMessage {
		readonly role: LanguageModelChatMessageRole;
		readonly content: ReadonlyArray<LanguageModelTextPart | LanguageModelToolResultPart | LanguageModelToolCallPart | LanguageModelDataPart>;
		readonly name: string | undefined;
	}
}
