import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Consumer type-checking (issue #4)', () => {
  const pkgRoot = path.resolve(__dirname, '../..');
  const vscodeTypesDir = path.resolve(pkgRoot, 'node_modules/@types/vscode');
  let tarballPath: string;

  beforeAll(() => {
    const out = execSync('npm pack --pack-destination /tmp 2>&1', {
      cwd: pkgRoot,
      encoding: 'utf8',
    });
    const filename = out.trim().split('\n').pop()!;
    tarballPath = path.join('/tmp', filename);
  });

  function createConsumerProject(tsconfig: Record<string, unknown>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'positron-consumer-'));

    // Install the packed tarball exactly as a real consumer would
    execSync(`npm init -y --silent && npm install --no-save ${tarballPath}`, {
      cwd: dir,
      stdio: 'pipe',
    });

    // Ensure @types/vscode is available (may already exist from npm install)
    const vscodeTarget = path.join(dir, 'node_modules', '@types', 'vscode');
    if (!fs.existsSync(vscodeTarget)) {
      const typesDir = path.join(dir, 'node_modules', '@types');
      fs.mkdirSync(typesDir, { recursive: true });
      fs.symlinkSync(vscodeTypesDir, vscodeTarget);
    }

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
