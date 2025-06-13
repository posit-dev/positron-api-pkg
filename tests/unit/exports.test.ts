import { describe, it, expect } from 'vitest';
import * as path from 'path';

describe('Package Export Tests', () => {
  it('should export all expected functions and types from the built package', async () => {
    // Dynamically import the built package
    const packagePath = path.resolve(__dirname, '../../dist/index.js');
    const packageExports = await import(packagePath);
    
    // Verify all expected exports exist
    const expectedExports = [
      'tryAcquirePositronApi',
      'inPositron',
      'previewUrl',
      'PositronApi' // This is a type export, so it won't be in runtime exports
    ];
    
    const runtimeExports = ['tryAcquirePositronApi', 'inPositron', 'previewUrl'];
    
    for (const exportName of runtimeExports) {
      expect(packageExports).toHaveProperty(exportName);
      expect(typeof packageExports[exportName]).toBe('function');
    }
  });

  it('should have correct export types', async () => {
    const packagePath = path.resolve(__dirname, '../../dist/index.js');
    const { tryAcquirePositronApi, inPositron, previewUrl } = await import(packagePath);
    
    // Test function types
    expect(typeof tryAcquirePositronApi).toBe('function');
    expect(typeof inPositron).toBe('function');
    expect(typeof previewUrl).toBe('function');
    
    // Test function behavior (basic smoke tests)
    expect(inPositron()).toBe(false); // Should be false in test environment
    expect(tryAcquirePositronApi()).toBeUndefined(); // Should be undefined in test environment
  });

  it('should export from the correct file structure', async () => {
    // Test that the dist directory has the expected structure
    const fs = await import('fs');
    const distPath = path.resolve(__dirname, '../../dist');
    
    const expectedFiles = [
      'index.js',
      'index.d.ts',
      'positron.d.ts',
      'ui-comm.d.ts',
      'runtime.js',
      'runtime.d.ts',
      'preview.js',
      'preview.d.ts'
    ];
    
    const distFiles = await fs.promises.readdir(distPath);
    
    for (const file of expectedFiles) {
      expect(distFiles).toContain(file);
    }
  });

  it('should have proper CommonJS exports', async () => {
    // Test that the package works with require() as well
    const packagePath = path.resolve(__dirname, '../../dist/index.js');
    
    // Use createRequire to test CommonJS compatibility
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    
    const packageExports = require(packagePath);
    
    expect(packageExports).toHaveProperty('tryAcquirePositronApi');
    expect(packageExports).toHaveProperty('inPositron');
    expect(packageExports).toHaveProperty('previewUrl');
  });

  it('should maintain backward compatibility', async () => {
    const packagePath = path.resolve(__dirname, '../../dist/index.js');
    const packageExports = await import(packagePath);
    
    // Ensure no unexpected exports that might break compatibility
    const actualExports = Object.keys(packageExports);
    const expectedExportsList = ['tryAcquirePositronApi', 'inPositron', 'previewUrl', 'default'];
    
    // Filter out type exports and internal symbols
    const publicExports = actualExports.filter(name => !name.startsWith('_') && name !== 'default');
    
    // Should only have our documented public API
    expect(publicExports.sort()).toEqual(['inPositron', 'previewUrl', 'tryAcquirePositronApi']);
  });
});