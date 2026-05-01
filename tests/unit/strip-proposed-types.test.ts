import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

function getProposedTypeReplacements(): string[] {
  const buildSrc = fs.readFileSync(
    path.resolve(__dirname, '../../build.js'),
    'utf8'
  );
  const match = buildSrc.match(
    /PROPOSED_TYPE_REPLACEMENTS\s*=\s*\[([\s\S]*?)\]/
  );
  if (!match) throw new Error('Could not find PROPOSED_TYPE_REPLACEMENTS in build.js');
  const names = [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  if (names.length === 0) throw new Error('PROPOSED_TYPE_REPLACEMENTS is empty');
  return names;
}

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
    const proposedTypes = getProposedTypeReplacements();
    for (const typeName of proposedTypes) {
      expect(distPositronDts).not.toContain(`vscode.${typeName}`);
    }
  });

  it('should still declare the positron module', () => {
    expect(distPositronDts).toContain("declare module 'positron'");
  });
});
