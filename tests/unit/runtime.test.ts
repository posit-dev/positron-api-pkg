import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPositronEnvironment, mockVscodeEnvironment, cleanupMocks } from '../setup';

// We'll test the compiled output
import { inPositron, tryAcquirePositronApi } from '../../dist/index.js';

describe('Runtime Functions', () => {
  beforeEach(() => {
    cleanupMocks();
  });

  describe('inPositron()', () => {
    it('should return true when globalThis.acquirePositronApi exists', () => {
      mockPositronEnvironment();
      expect(inPositron()).toBe(true);
    });

    it('should return false when globalThis.acquirePositronApi does not exist', () => {
      mockVscodeEnvironment();
      expect(inPositron()).toBe(false);
    });

    it('should return false when globalThis is undefined', () => {
      // Temporarily override globalThis check
      const originalGlobalThis = globalThis;
      try {
        // This test is more theoretical since globalThis is always defined in our test environment
        delete (globalThis as any).acquirePositronApi;
        expect(inPositron()).toBe(false);
      } finally {
        // Restore globalThis
        if (originalGlobalThis) {
          (global as any).globalThis = originalGlobalThis;
        }
      }
    });
  });

  describe('tryAcquirePositronApi()', () => {
    it('should return PositronApi when in Positron environment', () => {
      const mockApi = mockPositronEnvironment();
      const result = tryAcquirePositronApi();
      
      expect(result).toBeDefined();
      expect(result).toBe(mockApi);
      expect((globalThis as any).acquirePositronApi).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when not in Positron environment', () => {
      mockVscodeEnvironment();
      const result = tryAcquirePositronApi();
      
      expect(result).toBeUndefined();
    });

    it('should return undefined when acquirePositronApi throws an error', () => {
      // Mock acquirePositronApi to throw an error
      (globalThis as any).acquirePositronApi = vi.fn(() => {
        throw new Error('Failed to acquire API');
      });
      
      const result = tryAcquirePositronApi();
      
      expect(result).toBeUndefined();
      expect((globalThis as any).acquirePositronApi).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully without throwing', () => {
      // Mock acquirePositronApi to throw an error
      (globalThis as any).acquirePositronApi = vi.fn(() => {
        throw new Error('API initialization failed');
      });
      
      // This should not throw
      expect(() => tryAcquirePositronApi()).not.toThrow();
    });
  });
});