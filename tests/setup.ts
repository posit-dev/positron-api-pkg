import { beforeEach, afterEach, vi } from 'vitest';

// Store original global state
let originalAcquirePositronApi: any;
let originalVscode: any;

// Mock factory for Positron API
export function createMockPositronApi() {
  return {
    runtime: {
      executeCode: vi.fn(),
      getNotebookActiveCell: vi.fn(),
      onDidChangeActiveNotebook: vi.fn(),
    },
    window: {
      previewUrl: vi.fn(),
      previewHtml: vi.fn(),
      createVirtualDocument: vi.fn(),
    },
    languages: {
      registerCodeLensProvider: vi.fn(),
      registerCallHierarchyProvider: vi.fn(),
    },
    plots: {
      showPlot: vi.fn(),
      showHtmlPlot: vi.fn(),
      showWebviewPlot: vi.fn(),
    },
    connections: {
      registerConnectionDriver: vi.fn(),
      showConnectionsView: vi.fn(),
    },
    help: {
      showHelpTopic: vi.fn(),
      showHelpUrl: vi.fn(),
      showHelpHtml: vi.fn(),
    },
    variables: {
      getVariables: vi.fn(),
      onDidChangeVariables: vi.fn(),
    },
    dataViewer: {
      openDataViewer: vi.fn(),
    },
    // Add more namespaces as needed based on actual API structure
  };
}

// Mock factory for VS Code API
export function createMockVscodeApi() {
  return {
    env: {
      openExternal: vi.fn(),
      uriScheme: 'vscode',
    },
    window: {
      showErrorMessage: vi.fn(),
      showInformationMessage: vi.fn(),
    },
    Uri: {
      parse: vi.fn((uri: string) => ({ toString: () => uri })),
    },
  };
}

// Setup function to mock Positron environment
export function mockPositronEnvironment() {
  const mockApi = createMockPositronApi();
  (globalThis as any).acquirePositronApi = vi.fn(() => mockApi);
  return mockApi;
}

// Setup function to mock VS Code environment
export function mockVscodeEnvironment() {
  delete (globalThis as any).acquirePositronApi;
  const mockVscode = createMockVscodeApi();
  (globalThis as any).vscode = mockVscode;
  return mockVscode;
}

// Cleanup function to reset global state
export function cleanupMocks() {
  if (originalAcquirePositronApi !== undefined) {
    (globalThis as any).acquirePositronApi = originalAcquirePositronApi;
  } else {
    delete (globalThis as any).acquirePositronApi;
  }
  
  if (originalVscode !== undefined) {
    (globalThis as any).vscode = originalVscode;
  } else {
    delete (globalThis as any).vscode;
  }
  
  vi.clearAllMocks();
}

// Global setup hooks
beforeEach(() => {
  // Save original state
  originalAcquirePositronApi = (globalThis as any).acquirePositronApi;
  originalVscode = (globalThis as any).vscode;
});

afterEach(() => {
  // Restore original state
  cleanupMocks();
});