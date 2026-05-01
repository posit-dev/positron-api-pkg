# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the `@posit-dev/positron` npm package - TypeScript definitions and runtime utilities for the Positron API. It provides type-safe access to Positron-specific functionality for VS Code extensions that want enhanced features when running in Positron.

The package is positioned as a sibling to the main Positron repository and requires the Positron source to build:
```
work/
  positron/           # Main Positron IDE repository
  positron-api-pkg/   # This package
```

## Common Development Commands

### Building
```bash
# Complete build (gather types from Positron + compile)
npm run build

# Clean all generated files
npm run clean
```

### Testing
```bash
# Run all tests (builds first)
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run build && npx vitest
```

### Publishing
```bash
# Update version (patch/minor/major)
npm version patch

# Publish to npm (automatically runs build and tests via prepublishOnly)
npm publish
```

## Architecture & Build Process

The package has a sophisticated build pipeline that bridges the main Positron repository with this standalone npm package:

1. **Type Gathering** - Copies `positron.d.ts` and `ui-comm.d.ts` from `../positron/src/positron-dts/`
2. **TypeScript Compilation** - Compiles source files to CommonJS with declarations
3. **Ambient Declaration Distribution** - Copies ambient modules to `dist/`
4. **Reference Directive Injection** - Adds triple-slash references to `dist/index.d.ts`
5. **Package Validation** - Tests that the built package exports expected functions

### Key Files

- `build.js` - Complete build script with validation and error handling
- `src/index.ts` - Main entry point, re-exports runtime utilities and types
- `src/runtime.ts` - Core API detection functions (`tryAcquirePositronApi`, `inPositron`)
- `src/preview.ts` - Cross-platform URL preview functionality
- `src/positron.d.ts` - Generated ambient module declarations for 'positron' namespace
- `src/ui-comm.d.ts` - Generated ambient module declarations for 'ui-comm' namespace

### Module Structure

The package uses ambient module declarations to provide the Positron API types. The `positron` and `ui-comm` modules are declared as ambient modules that TypeScript recognizes globally when this package is imported.

Key architectural pattern:
```typescript
// Runtime detection of Positron environment
export function tryAcquirePositronApi(): PositronApi | undefined

// Type-only imports for compile-time usage
export type * from 'positron';
```

## Testing Approach

The package uses Vitest for comprehensive testing with:
- **Runtime function tests** - Mock both Positron and VS Code environments
- **Type definition tests** - Verify ambient modules and exports compile correctly
- **Package export tests** - Ensure the built package exports all expected functions
- **Coverage reporting** - Track test coverage with v8 provider
- **Module mocking** - Override Node.js require() to mock the 'vscode' module in tests

Tests run against the compiled output in `dist/` to match real-world usage.

## Important Patterns

1. **Dual Environment Support** - All code must gracefully handle both Positron and VS Code environments
2. **Ambient Module Pattern** - The 'positron' namespace is provided via ambient declarations, not actual modules
3. **Global Function Detection** - Positron injects `acquirePositronApi` globally; the package provides safe wrappers
4. **Reference Directives** - Triple-slash references ensure TypeScript finds ambient declarations

## Version Compatibility

The package follows the compatibility matrix in README.md:
- Targets VS Code API 1.74.0+ (peer dependency)
- Built for Positron 2025.07.0+
- Uses CommonJS output for maximum compatibility