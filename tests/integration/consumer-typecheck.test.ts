import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Consumer type-checking (issue #4)', () => {
  const distDir = path.resolve(__dirname, '../../dist');
  const vscodeTypesDir = path.resolve(__dirname, '../../node_modules/@types/vscode');

  function createConsumerProject(tsconfig: Record<string, unknown>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'positron-consumer-'));

    // Simulate an installed package: node_modules/@posit-dev/positron/dist -> our dist
    const pkgDir = path.join(dir, 'node_modules', '@posit-dev', 'positron');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.symlinkSync(distDir, path.join(pkgDir, 'dist'));
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({
      name: '@posit-dev/positron',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
    }));

    // Provide @types/vscode from our own node_modules
    const typesDir = path.join(dir, 'node_modules', '@types');
    fs.mkdirSync(typesDir, { recursive: true });
    fs.symlinkSync(vscodeTypesDir, path.join(typesDir, 'vscode'));

    fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
    fs.writeFileSync(path.join(dir, 'index.ts'), [
      'import { tryAcquirePositronApi, inPositron } from "@posit-dev/positron";',
      'const api = tryAcquirePositronApi();',
      'console.log(api?.version, inPositron());',
    ].join('\n'));

    return dir;
  }

  function tscCheck(projectDir: string): { ok: boolean; output: string } {
    try {
      execSync('tsc --noEmit', { cwd: projectDir, stdio: 'pipe' });
      return { ok: true, output: '' };
    } catch (err: any) {
      return { ok: false, output: err.stdout?.toString() + err.stderr?.toString() };
    }
  }

  it('should compile with skipLibCheck: false (commonjs)', () => {
    const dir = createConsumerProject({
      compilerOptions: {
        module: 'commonjs',
        target: 'ES2020',
        strict: true,
        skipLibCheck: false,
      },
    });
    const result = tscCheck(dir);
    expect(result.output, 'tsc errors:\n' + result.output).toBe('');
    expect(result.ok).toBe(true);
  });

  it('should compile with skipLibCheck: true (commonjs)', () => {
    const dir = createConsumerProject({
      compilerOptions: {
        module: 'commonjs',
        target: 'ES2020',
        strict: true,
        skipLibCheck: true,
      },
    });
    const result = tscCheck(dir);
    expect(result.output, 'tsc errors:\n' + result.output).toBe('');
    expect(result.ok).toBe(true);
  });

  it('should compile with node16 module resolution', () => {
    const dir = createConsumerProject({
      compilerOptions: {
        module: 'Node16',
        moduleResolution: 'Node16',
        target: 'ES2020',
        strict: true,
        skipLibCheck: false,
      },
    });
    const result = tscCheck(dir);
    expect(result.output, 'tsc errors:\n' + result.output).toBe('');
    expect(result.ok).toBe(true);
  });
});
