/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Complete build script for @posit-dev/positron package
 *
 * This script handles the entire build process from source gathering to final package generation.
 * It combines what were previously separate "gather" and "compile" steps into a single workflow.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Centralize paths to prevent duplication and make maintenance easier
const PATHS = {
	// This should sitting in a directory next to the positron repo
	SOURCE_DIR: path.join(__dirname, '../positron/src/positron-dts'),
	VSCODE_DTS_DIR: path.join(__dirname, '../positron/src/vscode-dts'),
	PACKAGE_SRC: path.join(__dirname, 'src'),
	DIST_DIR: path.join(__dirname, 'dist')
};

// Centralize filenames to avoid typos and enable easy renaming
const FILES = {
	POSITRON_DTS: 'positron.d.ts',
	UI_COMM_DTS: 'ui-comm.d.ts',
	INDEX_DTS: 'index.d.ts',
	VSCODE_COMPAT_DTS: 'vscode.positron-compat.d.ts'
};

// Source of truth lives in package.json's devDependencies entry. The peer range
// may be looser; this constant is the exact version we publish having validated.
const SUPPORTED_VSCODE_TYPES = require('./package.json').devDependencies['@types/vscode'];

console.log('🔨 Building @posit-dev/positron package...\n');

// =============================================================================
// PREREQUISITE VALIDATION
// =============================================================================
// Early validation prevents confusing error messages later in the build process

console.log('🔍 Validating prerequisites...');

const sourceFile = path.join(PATHS.SOURCE_DIR, FILES.POSITRON_DTS);
const uiCommFile = path.join(PATHS.SOURCE_DIR, FILES.UI_COMM_DTS);

if (!fs.existsSync(sourceFile)) {
	console.error(`   ❌ Source file not found: ${sourceFile}`);
	process.exit(1);
}

if (!fs.existsSync(uiCommFile)) {
	console.error(`   ❌ Source file not found: ${uiCommFile}`);
	process.exit(1);
}

// Verify tsconfig base file exists (we extend from Positron's base config)
const tsconfigBase = path.join(__dirname, '../positron/src/tsconfig.base.json');
if (!fs.existsSync(tsconfigBase)) {
	console.error(`   ❌ TypeScript base config not found: ${tsconfigBase}`);
	console.error('   Make sure the Positron repository is cloned at ../positron');
	process.exit(1);
}

// Fail fast if TypeScript isn't available rather than during compilation
try {
	execSync('tsc --version', { stdio: 'pipe' });
} catch (error) {
	console.error('   ❌ TypeScript compiler not found. Please install TypeScript globally or in this project.');
	process.exit(1);
}

// Verify we're in the correct working directory
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
	console.error('   ❌ package.json not found. Are you running this script from the correct directory?');
	process.exit(1);
}

console.log('   ✅ All prerequisites validated');

// =============================================================================
// STEP 1: GATHER TYPE DEFINITIONS FROM MAIN POSITRON SOURCE
// =============================================================================
// Copy ambient module declarations from the main Positron repository.
// These .d.ts files contain 'declare module' statements that register the
// 'positron' and 'ui-comm' modules in TypeScript's module system, making
// them available for import in consumer code.

console.log('📥 Step 1: Gathering type definitions from Positron source...');

// Create src directory if missing to avoid copy failures
if (!fs.existsSync(PATHS.PACKAGE_SRC)) {
	try {
		fs.mkdirSync(PATHS.PACKAGE_SRC, { recursive: true });
	} catch (error) {
		console.error(`   ❌ Failed to create package source directory: ${error.message}`);
		process.exit(1);
	}
}

// Copy source files with error handling to catch permission or disk space issues
try {
	fs.copyFileSync(sourceFile, path.join(PATHS.PACKAGE_SRC, FILES.POSITRON_DTS));
	fs.copyFileSync(uiCommFile, path.join(PATHS.PACKAGE_SRC, FILES.UI_COMM_DTS));
	console.log('   ✅ Type definitions copied to package source directory');
} catch (error) {
	console.error(`   ❌ Failed to copy type definitions: ${error.message}`);
	process.exit(1);
}

// =============================================================================
// STEP 2: COMPILE TYPESCRIPT SOURCE CODE
// =============================================================================
// Run the TypeScript compiler to transform our TypeScript source files into
// JavaScript (.js) and declaration files (.d.ts). This generates the main
// package entry point that consumers will actually use.

console.log('\n🔧 Step 2: Compiling TypeScript source code...');

try {
	execSync('tsc --project tsconfig.json', { stdio: 'inherit', cwd: __dirname });

	// Verify compilation actually produced output files
	const indexJs = path.join(PATHS.DIST_DIR, 'index.js');
	const indexDts = path.join(PATHS.DIST_DIR, 'index.d.ts');

	if (!fs.existsSync(indexJs) || !fs.existsSync(indexDts)) {
		console.error('   ❌ TypeScript compilation produced no output files');
		console.error(`   Expected: ${indexJs}`);
		console.error(`   Expected: ${indexDts}`);
		console.error('   This usually means tsconfig.json extends a missing base config');
		process.exit(1);
	}

	console.log('   ✅ TypeScript compilation completed');
} catch (error) {
	console.error('   ❌ TypeScript compilation failed');
	process.exit(1);
}

// =============================================================================
// STEP 3: COPY AMBIENT DECLARATIONS TO DISTRIBUTION
// =============================================================================
// Copy the ambient module declarations from src/ to dist/ so they're included
// in the published package. These files must be distributed alongside the
// compiled code to make the 'positron' and 'ui-comm' namespaces available
// to package consumers.

console.log('\n📦 Step 3: Copying ambient module declarations to distribution...');

// Copy files with error handling since dist operations can fail due to permissions
try {
	fs.copyFileSync(path.join(PATHS.PACKAGE_SRC, FILES.POSITRON_DTS), path.join(PATHS.DIST_DIR, FILES.POSITRON_DTS));
	fs.copyFileSync(path.join(PATHS.PACKAGE_SRC, FILES.UI_COMM_DTS), path.join(PATHS.DIST_DIR, FILES.UI_COMM_DTS));
	console.log('   ✅ Ambient declarations copied to dist/');
} catch (error) {
	console.error(`   ❌ Failed to copy ambient declarations: ${error.message}`);
	process.exit(1);
}

// =============================================================================
// STEP 3.5: BUNDLE VSCODE-DTS FILES REFERENCED BY positron.d.ts
// =============================================================================
// positron.d.ts contains `/// <reference path="../vscode-dts/..."> ` directives
// for Positron-specific proposed VS Code API types that are not in @types/vscode.
// Without bundling these files, consumers hit TS6053 ("file not found") errors
// (see issue #4). We:
//   1. Parse the reference directives from positron.d.ts
//   2. Copy each referenced file from ../positron/src/vscode-dts into dist/vscode-dts
//   3. Rewrite the reference paths in dist/positron.d.ts to ./vscode-dts/...
//      so they resolve relative to dist/ (where the published package lives).

console.log('\n📦 Step 3.5: Bundling vscode-dts files referenced by positron.d.ts...');

const distPositronDts = path.join(PATHS.DIST_DIR, FILES.POSITRON_DTS);
const distVscDtsDir = path.join(PATHS.DIST_DIR, 'vscode-dts');
const referenceRegex = /\/\/\/\s*<reference\s+path=["']([^"']+)["']\s*\/>/g;
const languageModelResponsePartAlias =
	'export type LanguageModelResponsePart2 = LanguageModelResponsePart | LanguageModelDataPart | LanguageModelThinkingPart;';
const inlinedLanguageModelResponsePartAlias =
	'export type LanguageModelResponsePart2 = LanguageModelTextPart | LanguageModelToolResultPart | LanguageModelToolCallPart | LanguageModelDataPart | LanguageModelThinkingPart;';

try {
	const positronDtsContent = fs.readFileSync(distPositronDts, 'utf8');
	const referencedFiles = [];
	const referencedFileSet = new Set();
	let match;
	while ((match = referenceRegex.exec(positronDtsContent)) !== null) {
		const refPath = match[1];
		// Only handle paths pointing at vscode-dts; skip anything else.
		if (!refPath.includes('vscode-dts/')) continue;
		const filename = path.basename(refPath);
		if (!referencedFileSet.has(filename)) {
			referencedFiles.push(filename);
			referencedFileSet.add(filename);
		}
	}

	if (referencedFiles.length === 0) {
		throw new Error('Expected vscode-dts reference directives in dist/positron.d.ts but found none');
	}

	fs.mkdirSync(distVscDtsDir, { recursive: true });
	fs.copyFileSync(
		path.join(PATHS.PACKAGE_SRC, FILES.VSCODE_COMPAT_DTS),
		path.join(distVscDtsDir, FILES.VSCODE_COMPAT_DTS)
	);

	for (const file of referencedFiles) {
		const srcFile = path.join(PATHS.VSCODE_DTS_DIR, file);
		if (!fs.existsSync(srcFile)) {
			console.error(`   ❌ Referenced vscode-dts file not found: ${srcFile}`);
			process.exit(1);
		}
		fs.copyFileSync(srcFile, path.join(distVscDtsDir, file));
	}

	const chatProviderDts = path.join(distVscDtsDir, 'vscode.proposed.chatProvider.d.ts');
	if (fs.existsSync(chatProviderDts)) {
		const chatProviderContent = fs.readFileSync(chatProviderDts, 'utf8');
		const rewrittenChatProvider = chatProviderContent.replace(
			languageModelResponsePartAlias,
			inlinedLanguageModelResponsePartAlias
		);
		if (rewrittenChatProvider === chatProviderContent) {
			throw new Error(
				'Expected to rewrite LanguageModelResponsePart2 alias in vscode.proposed.chatProvider.d.ts; upstream literal may have changed'
			);
		}
		fs.writeFileSync(chatProviderDts, rewrittenChatProvider);
	}

	// Rewrite reference paths so they resolve inside dist/, then prepend a
	// reference to the local compatibility shim before the first one.
	const rewrittenReferences = positronDtsContent.replace(
		referenceRegex,
		(full, refPath) => {
			if (!refPath.includes('vscode-dts/')) return full;
			return `/// <reference path="./vscode-dts/${path.basename(refPath)}" />`;
		}
	);
	const compatReference = `/// <reference path="./vscode-dts/${FILES.VSCODE_COMPAT_DTS}" />`;
	const firstRefMarker = '/// <reference path="./vscode-dts/';
	const rewritten = rewrittenReferences.replace(firstRefMarker, `${compatReference}\n${firstRefMarker}`);
	fs.writeFileSync(distPositronDts, rewritten);

	console.log(`   ✅ Bundled ${referencedFiles.length} vscode-dts file(s) into dist/vscode-dts/`);
	console.log('   ✅ Added VS Code compatibility declarations');
	console.log('   ✅ Rewrote reference paths in dist/positron.d.ts to point inside dist/');
} catch (error) {
	console.error(`   ❌ Failed to bundle vscode-dts files: ${error.message}`);
	process.exit(1);
}

// =============================================================================
// STEP 4: ADD REFERENCE DIRECTIVES TO MAIN DECLARATION FILE
// =============================================================================
// Modify the compiled index.d.ts file to include reference directives that
// point to our ambient module declarations. This ensures TypeScript can
// properly resolve the 'positron' and 'ui-comm' modules when consumers
// import this package.

console.log('\n🔗 Step 4: Adding reference directives to main declaration file...');

const indexFile = path.join(PATHS.DIST_DIR, FILES.INDEX_DTS);

// Handle file operations with error checking since file corruption here breaks the entire package
try {
	const content = fs.readFileSync(indexFile, 'utf8');
	const references = [
		`/// <reference path="./${FILES.POSITRON_DTS}" />`,
		`/// <reference path="./${FILES.UI_COMM_DTS}" />`,
		'',
		content
	].join('\n');

	fs.writeFileSync(indexFile, references);
	console.log('   ✅ Reference directives added to index.d.ts');
} catch (error) {
	console.error(`   ❌ Failed to add reference directives: ${error.message}`);
	process.exit(1);
}

// =============================================================================
// STEP 4.5: VALIDATE PUBLISHED DECLARATION FILES
// =============================================================================
// Validate the declaration files exactly as consumers will load them, without
// skipLibCheck. This catches missing bundled proposed VS Code API dependencies.

console.log('\n🔍 Step 4.5: Validating published declaration files...');

try {
	const vscodeTypesPackage = require(path.join(__dirname, 'node_modules/@types/vscode/package.json'));
	if (vscodeTypesPackage.version !== SUPPORTED_VSCODE_TYPES) {
		throw new Error(
			`Expected @types/vscode ${SUPPORTED_VSCODE_TYPES} for peer validation, got ${vscodeTypesPackage.version}`
		);
	}

	execSync(
		'tsc --noEmit --skipLibCheck false --target ES2024 --module NodeNext --moduleResolution NodeNext --types vscode dist/index.d.ts',
		{ stdio: 'inherit', cwd: __dirname }
	);
	console.log(`   ✅ Published declaration files passed strict type checking with @types/vscode ${SUPPORTED_VSCODE_TYPES}`);
} catch (error) {
	console.error(`   ❌ Published declaration files failed strict type checking: ${error.message}`);
	process.exit(1);
}

// =============================================================================
// STEP 5: VALIDATE BUILT PACKAGE
// =============================================================================
// Test that the built package can actually be imported and used. This ensures
// that all the compilation and file operations resulted in a working package
// that exports the expected functionality.

console.log('\n🔍 Step 5: Validating built package...');

try {
	// Test that the built package can be required (CommonJS output)
	const builtPackage = require(path.join(PATHS.DIST_DIR, 'index.js'));

	// Verify the main export exists
	if (typeof builtPackage.tryAcquirePositronApi !== 'function') {
		throw new Error('tryAcquirePositronApi function not exported');
	}

	// Test that the function returns undefined in this environment (expected behavior)
	const api = builtPackage.tryAcquirePositronApi();
	if (api !== undefined) {
		throw new Error('tryAcquirePositronApi should return undefined in build environment');
	}

	console.log('   ✅ Package validation passed');
	console.log('   ✅ tryAcquirePositronApi function is properly exported');
	console.log('   ✅ Function correctly returns undefined in non-Positron environment');
} catch (error) {
	console.error(`   ❌ Package validation failed: ${error.message}`);
	process.exit(1);
}

// =============================================================================
// BUILD COMPLETE
// =============================================================================

console.log('\n🎉 Build completed successfully!');
console.log('\n📋 Generated files:');
console.log('   • dist/index.js     - Runtime API detection function');
console.log('   • dist/index.d.ts   - Main TypeScript definitions');
console.log('   • dist/positron.d.ts - Ambient \'positron\' module declarations');
console.log('   • dist/ui-comm.d.ts  - Ambient \'ui-comm\' module declarations');
console.log('\n🚀 Package is ready for publishing or consumption!');
