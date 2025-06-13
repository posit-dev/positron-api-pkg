# Testing Implementation Plan for @posit-dev/positron

## Overview
Add a comprehensive test suite to the `@posit-dev/positron` package using Vitest. The tests will verify both runtime behavior (with appropriate mocking) and TypeScript type definitions, ensuring the package works correctly in both Positron and VS Code environments.

## Architecture Decision
- **Vitest** for testing framework - modern, fast, with excellent TypeScript support
- **Separate test files** for each module to maintain clarity
- **Global setup file** to handle environment mocking consistently
- **Type tests** using TypeScript compilation checks and type assertions
- **Run tests on compiled output** to match real-world usage

## Prerequisites
- Node.js and npm installed
- Access to modify package.json and create test files
- Understanding of the package's dual-environment architecture

## Step-by-Step Implementation Guide

### Step 1: Install Testing Dependencies
Add Vitest and related dependencies to `package.json`:
- `vitest` - testing framework
- `@vitest/coverage-v8` - code coverage
- `@types/node` - Node.js types for test environment
- `happy-dom` or `jsdom` - DOM environment for VS Code mocks

### Step 2: Configure Vitest
Create `vitest.config.ts` in project root:
- Set test environment
- Configure coverage settings
- Set up globals
- Define test file patterns
- Configure module resolution for testing compiled output

### Step 3: Create Test Directory Structure
1. Create `tests/` directory
2. Create subdirectories:
   - `tests/unit/` - runtime function tests
   - `tests/types/` - type definition tests

### Step 4: Create Global Test Setup
Create `tests/setup.ts`:
- Define reusable mocks for `globalThis.acquirePositronApi`
- Create VS Code API mocks
- Provide cleanup functions to reset global state between tests

### Step 5: Implement Runtime Function Tests

#### Create `tests/unit/runtime.test.ts`:
- Test `inPositron()` with and without global API
- Test `tryAcquirePositronApi()` in all scenarios
- Include error case testing

#### Create `tests/unit/preview.test.ts`:
- Mock both Positron and VS Code environments
- Test URL preview in both environments
- Test error handling

### Step 6: Implement Type Definition Tests

#### Create `tests/types/ambient-modules.test.ts`:
- Import from 'positron' module
- Import from 'ui-comm' module
- Verify types compile correctly

#### Create `tests/types/exports.test.ts`:
- Test that exported types are accessible
- Verify function signatures match expectations

### Step 7: Add Package Export Tests
Create `tests/unit/exports.test.ts`:
- Dynamically import the built package
- Verify all expected exports exist
- Check export types (function, object, etc.)

### Step 8: Update Build Process

#### Modify `build.js`:
- Keep existing validation
- Add note about running tests after build

#### Update `package.json` scripts:
- Add `test` script
- Add `test:coverage` script
- Update `prepublishOnly` to include tests

### Step 9: Create Test Documentation
1. Add testing section to README.md
2. Document how to run tests
3. Explain mocking approach

## Testing Strategy

### Unit Tests:
- Mock global APIs at the test level
- Test each function in isolation
- Cover all code paths
- Verify error handling

### Type Tests:
- Use TypeScript's type checking
- Test import scenarios
- Verify ambient module declarations work

### Integration Tests:
- Test that compiled package works as expected
- Verify exports match TypeScript definitions

## Test Specifications

### Runtime Function Tests

#### `inPositron()` Tests
- Test returns true when globalThis.acquirePositronApi exists
- Test returns false when globalThis.acquirePositronApi does not exist

#### `tryAcquirePositronApi()` Tests
- Test returns PositronApi when in Positron environment
- Test returns undefined when not in Positron environment
- Test returns undefined when acquirePositronApi throws an error

#### `previewUrl()` Tests
- Test uses Positron preview API when available
- Test uses VS Code env.openExternal when not in Positron
- Test handles invalid URLs gracefully

### Type Definition Tests
- Test positron ambient module types are accessible
- Test ui-comm ambient module types are accessible
- Test global acquirePositronApi type definition
- Test package exports all expected types

## Migration/Deployment Plan

### Initial Setup:
1. Install dependencies
2. Run tests locally to verify setup

### CI Integration:
1. Update CI pipeline to run tests
2. Ensure tests run on compiled output
3. Add coverage reporting

### Rollback:
- Tests are additive only
- No changes to existing functionality
- Can remove test files if issues arise

## Monitoring & Verification

- **Coverage Reports:** Monitor via `vitest coverage`
- **CI Status:** Ensure all tests pass in CI
- **Type Checking:** TypeScript compilation remains error-free
- **Performance:** Tests should complete in < 10 seconds

## Documentation Updates

### README.md:
- Add "Testing" section
- Document test commands
- Explain mocking strategy

### CLAUDE.md:
- Update with test commands
- Note testing approach

### Code Comments:
- Document complex mocks
- Explain test intentions

## Risk Mitigation

### Potential Issues:

1. **Global State Pollution**
   - Mitigation: Clean up globals after each test
   - Use `beforeEach`/`afterEach` hooks

2. **Vitest Configuration Complexity**
   - Mitigation: Start with minimal config
   - Document any special settings

3. **Type Test Limitations**
   - Mitigation: Combine with runtime tests
   - Use type assertion helpers

4. **Mock Complexity**
   - Mitigation: Create reusable mock factories
   - Document mock behavior clearly

## File Structure
```
tests/
  setup.ts           - Test setup and global mocks
  unit/
    runtime.test.ts  - Tests for runtime.ts functions
    preview.test.ts  - Tests for preview.ts functions
    exports.test.ts  - Package export verification
  types/
    ambient-modules.test.ts - Ambient module type tests
    exports.test.ts         - Type export tests
```

## Coverage Goals
- 100% line coverage for runtime functions
- All exported functions tested
- Both environment paths tested (Positron and VS Code)
- Error cases handled