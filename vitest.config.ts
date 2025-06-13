import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use node environment since we're testing a Node.js package
    environment: 'node',
    
    // Enable globals
    globals: true,
    
    // Test file patterns
    include: ['tests/**/*.test.ts'],
    
    // Setup files to run before each test file
    setupFiles: ['./tests/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['dist/**/*.js'],
      exclude: ['dist/**/*.d.ts', 'dist/positron.d.ts', 'dist/ui-comm.d.ts']
    },
    
    // Module resolution - test the compiled output
    resolve: {
      alias: {
        '@posit-dev/positron': path.resolve(__dirname, 'dist/index.js')
      }
    }
  }
});