import { describe, it, expect } from 'vitest';
import { expectTypeOf } from 'vitest';

// For type tests, we'll use type imports only
import type * as positron from 'positron';

describe('Ambient Module Type Tests', () => {
  describe('positron module types', () => {
    it('should compile with positron type imports', () => {
      // Test that we can use positron types in type annotations
      type RuntimeNamespace = typeof positron.runtime;
      type WindowNamespace = typeof positron.window;
      
      // If this compiles, the ambient module is working
      expect(true).toBe(true);
    });

    it('should have expected namespace types', () => {
      // Type-level test using expectTypeOf
      type PositronAPI = typeof positron;
      
      expectTypeOf<PositronAPI>().toHaveProperty('runtime');
      expectTypeOf<PositronAPI>().toHaveProperty('window');
      expectTypeOf<PositronAPI>().toHaveProperty('languages');
      expectTypeOf<PositronAPI>().toHaveProperty('connections');
    });
  });

  describe('ui-comm types via positron namespace', () => {
    it('should compile with ui-comm types via positron', () => {
      // Test that we can use ui-comm types through positron namespace
      type EditorContextType = positron.EditorContext;
      
      // If this compiles, the type re-export is working
      expect(true).toBe(true);
    });

    it('should have EditorContext type available', () => {
      // Type-level test for EditorContext
      expectTypeOf<positron.EditorContext>().toHaveProperty('document');
      expectTypeOf<positron.EditorContext>().toHaveProperty('contents');
      expectTypeOf<positron.EditorContext>().toHaveProperty('selection'); 
      expectTypeOf<positron.EditorContext>().toHaveProperty('selections');
    });
  });

  describe('global acquirePositronApi type', () => {
    it('should have the correct type on globalThis', () => {
      // Test that the global function has the correct type signature
      expectTypeOf(globalThis.acquirePositronApi).toMatchTypeOf<
        (() => typeof positron | undefined) | undefined
      >();
    });
  });

  describe('TypeScript compilation test', () => {
    it('should allow using ambient modules in type annotations', () => {
      // This test verifies that TypeScript can compile code using these types
      function testFunction(api: typeof positron): void {
        // Type annotation using ambient module
      }
      
      function testEditorContext(ctx: positron.EditorContext): void {
        // Type annotation using EditorContext from positron namespace
      }
      
      // If this compiles without errors, the test passes
      expect(true).toBe(true);
    });
  });
});