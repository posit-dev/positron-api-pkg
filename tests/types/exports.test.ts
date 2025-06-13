import { describe, it, expect } from 'vitest';
import { expectTypeOf } from 'vitest';

// Import all exports from the package
import {
  tryAcquirePositronApi,
  inPositron,
  previewUrl,
  type PositronApi
} from '../../dist/index.js';

// Import type exports
import type * as PositronTypes from '@posit-dev/positron';

describe('Package Export Type Tests', () => {
  describe('Runtime function types', () => {
    it('should export tryAcquirePositronApi with correct signature', () => {
      expectTypeOf(tryAcquirePositronApi).toBeFunction();
      expectTypeOf(tryAcquirePositronApi).returns.toMatchTypeOf<PositronApi | undefined>();
    });

    it('should export inPositron with correct signature', () => {
      expectTypeOf(inPositron).toBeFunction();
      expectTypeOf(inPositron).returns.toBeBoolean();
    });
  });

  describe('Preview function types', () => {
    it('should export previewUrl with correct signature', () => {
      expectTypeOf(previewUrl).toBeFunction();
      expectTypeOf(previewUrl).parameter(0).toBeString();
      expectTypeOf(previewUrl).returns.toMatchTypeOf<Promise<void>>();
    });
  });

  describe('Type exports', () => {
    it('should export PositronApi type', () => {
      // PositronApi should match the shape of the positron module
      type TestApi = PositronApi;
      expectTypeOf<TestApi>().toHaveProperty('runtime');
      expectTypeOf<TestApi>().toHaveProperty('window');
      expectTypeOf<TestApi>().toHaveProperty('languages');
    });

    it('should re-export all types from positron module', () => {
      // Test that we can access positron types through the package
      type RuntimeNamespace = PositronTypes.runtime;
      type WindowNamespace = PositronTypes.window;
      
      // These should compile without errors
      expectTypeOf<RuntimeNamespace>().toBeObject();
      expectTypeOf<WindowNamespace>().toBeObject();
    });
  });

  describe('Global type augmentations', () => {
    it('should augment global with acquirePositronApi', () => {
      // The global augmentation should be available
      expectTypeOf(global).toHaveProperty('acquirePositronApi');
      expectTypeOf(globalThis).toHaveProperty('acquirePositronApi');
    });
  });
});