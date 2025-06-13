import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mockPositronEnvironment, mockVscodeEnvironment, cleanupMocks } from '../setup';
import { Module } from 'module';

// Store original require
const originalRequire = Module.prototype.require;

// Create vscode mock
const vscodeMock = {
  Uri: {
    parse: vi.fn((url: string) => ({ toString: () => url, scheme: 'https' }))
  },
  env: {
    openExternal: vi.fn(() => Promise.resolve(true))
  }
};

// Override require to handle 'vscode' module
(Module.prototype as any).require = function(id: string) {
  if (id === 'vscode') {
    return vscodeMock;
  }
  return originalRequire.apply(this, arguments);
};

// We'll test the compiled output
import { previewUrl } from '../../dist/index.js';

describe('Preview Functions', () => {
  beforeEach(() => {
    cleanupMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear mock calls
    vscodeMock.Uri.parse.mockClear();
    vscodeMock.env.openExternal.mockClear();
  });

  describe('previewUrl()', () => {
    it('should use Positron preview API when available', async () => {
      const mockApi = mockPositronEnvironment();
      const testUrl = 'https://example.com';
      
      await previewUrl(testUrl);
      
      // Check that Positron's previewUrl was called
      expect(mockApi.window.previewUrl).toHaveBeenCalledTimes(1);
      expect(mockApi.window.previewUrl).toHaveBeenCalledWith(
        expect.objectContaining({ toString: expect.any(Function) })
      );
      
      // Check that VS Code's openExternal was NOT called
      expect(vscodeMock.env.openExternal).not.toHaveBeenCalled();
    });

    it('should use VS Code env.openExternal when not in Positron', async () => {
      mockVscodeEnvironment();
      const testUrl = 'https://example.com';
      
      await previewUrl(testUrl);
      
      // Check that VS Code's openExternal was called
      expect(vscodeMock.env.openExternal).toHaveBeenCalledTimes(1);
      expect(vscodeMock.env.openExternal).toHaveBeenCalledWith(
        expect.objectContaining({ toString: expect.any(Function) })
      );
    });

    it('should handle different URL formats', async () => {
      mockVscodeEnvironment();
      const urls = [
        'https://example.com',
        'http://localhost:3000',
        'file:///path/to/file.html',
        'https://example.com/path?query=value#hash'
      ];
      
      for (const url of urls) {
        vi.clearAllMocks();
        await previewUrl(url);
        
        expect(vscodeMock.Uri.parse).toHaveBeenCalledWith(url);
        expect(vscodeMock.env.openExternal).toHaveBeenCalledTimes(1);
      }
    });

    it('should handle invalid URLs gracefully', async () => {
      mockVscodeEnvironment();
      const invalidUrl = 'not-a-valid-url';
      
      // The function should not throw, even with invalid URLs
      await expect(previewUrl(invalidUrl)).resolves.not.toThrow();
      
      expect(vscodeMock.Uri.parse).toHaveBeenCalledWith(invalidUrl);
    });

    it('should handle localhost URLs in both environments', async () => {
      const localhostUrl = 'http://localhost:8080/app';
      
      // Test in Positron
      const mockApi = mockPositronEnvironment();
      await previewUrl(localhostUrl);
      expect(mockApi.window.previewUrl).toHaveBeenCalledTimes(1);
      
      // Clean up and test in VS Code
      cleanupMocks();
      vi.clearAllMocks();
      mockVscodeEnvironment();
      await previewUrl(localhostUrl);
      
      expect(vscodeMock.env.openExternal).toHaveBeenCalledTimes(1);
    });
  });
});