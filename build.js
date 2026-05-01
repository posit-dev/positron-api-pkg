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
	PACKAGE_SRC: path.join(__dirname, 'src'),
	DIST_DIR: path.join(__dirname, 'dist')
};

// Centralize filenames to avoid typos and enable easy renaming
const FILES = {
	POSITRON_DTS: 'positron.d.ts',
	UI_COMM_DTS: 'ui-comm.d.ts',
	INDEX_DTS: 'index.d.ts'
};

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
// STEP 3.5: STRIP PROPOSED VSCODE-DTS REFERENCES FROM positron.d.ts
// =============================================================================
// positron.d.ts contains `/// <reference path="../vscode-dts/...">` directives
// pointing at Positron-specific proposed VS Code API files. These files live in
// the Positron monorepo and are not shipped with this package, so consumers hit
// TS6053 ("file not found") errors (see issue #4).
//
// The types introduced by those proposed APIs are only used in a handful of
// provider-facing signatures (positron.ai.LanguageModelChatProvider). Rather
// than bundling the external files, we strip the reference directives and
// replace the proposed types with `any` so the file is self-contained.

console.log('\n📦 Step 3.5: Stripping proposed vscode-dts references from positron.d.ts...');

const distPositronDts = path.join(PATHS.DIST_DIR, FILES.POSITRON_DTS);
const vscDtsRefRegex = /^\/\/\/\s*<reference\s+path=["'][^"']*vscode-dts\/[^"']*["']\s*\/>\s*\n?/gm;

const PROPOSED_TYPE_REPLACEMENTS = [
	'LanguageModelChatInformation',
	'ProvideLanguageModelChatResponseOptions',
	'LanguageModelResponsePart2',
	'LanguageModelChatMessage2',
];

try {
	let content = fs.readFileSync(distPositronDts, 'utf8');

	const refCount = (content.match(vscDtsRefRegex) || []).length;
	if (refCount === 0) {
		console.warn(
			'   ⚠️  No vscode-dts reference directives found in dist/positron.d.ts; ' +
			'if upstream removed them, Step 3.5 can be deleted'
		);
	}
	content = content.replace(vscDtsRefRegex, '');

	for (const typeName of PROPOSED_TYPE_REPLACEMENTS) {
		const typeRegex = new RegExp(`vscode\\.${typeName}`, 'g');
		content = content.replace(typeRegex, 'any');
	}

	// Clean up residual `X | any` unions and `extends any` constraints left
	// by the naive find-and-replace so the output reads intentionally.
	content = content.replace(/\w[\w.]*(?:\s*\|\s*\w[\w.]*)*\s*\|\s*any/g, 'any');
	content = content.replace(/<T\s+extends\s+any\s*=\s*any>/g, '<T = any>');

	const leftover = content.match(/vscode-dts\//g);
	if (leftover) {
		throw new Error(`Stripped references but ${leftover.length} vscode-dts path(s) remain`);
	}

	fs.writeFileSync(distPositronDts, content);
	console.log(`   ✅ Removed ${refCount} vscode-dts reference directive(s)`);
	console.log(`   ✅ Replaced ${PROPOSED_TYPE_REPLACEMENTS.length} proposed type(s) with \`any\``);
} catch (error) {
	console.error(`   ❌ Failed to strip vscode-dts references: ${error.message}`);
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
