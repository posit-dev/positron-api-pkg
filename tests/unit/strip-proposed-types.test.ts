import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Strip proposed vscode-dts types (issue #4)', () => {
  const distPositronDts = fs.readFileSync(
    path.resolve(__dirname, '../../dist/positron.d.ts'),
    'utf8'
  );

  it('should not contain vscode-dts reference directives', () => {
    const refs = distPositronDts.match(
      /\/\/\/\s*<reference\s+path=["'][^"']*vscode-dts\/[^"']*["']\s*\/>/g
    );
    expect(refs).toBeNull();
  });

  it('should not reference proposed-only types', () => {
    const proposedTypes = [
      'vscode.LanguageModelChatInformation',
      'vscode.ProvideLanguageModelChatResponseOptions',
      'vscode.LanguageModelResponsePart2',
      'vscode.LanguageModelChatMessage2',
    ];
    for (const typeName of proposedTypes) {
      expect(distPositronDts).not.toContain(typeName);
    }
  });

  it('should still declare the positron module', () => {
    expect(distPositronDts).toContain("declare module 'positron'");
  });
});
