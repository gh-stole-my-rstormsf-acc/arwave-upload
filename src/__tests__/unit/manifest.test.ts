import { describe, expect, it } from 'vitest';
import { buildManifest, createStableFilePath } from '../../lib/manifest';

describe('manifest builder', () => {
  it('builds a valid path manifest for multiple files', () => {
    const files = [
      new File(['hello'], 'index.html', { type: 'text/html' }),
      new File(['app'], 'app.js', { type: 'application/javascript' }),
    ];

    const manifest = buildManifest(files, ['tx-1', 'tx-2']);

    expect(manifest.manifest).toBe('arweave/paths');
    expect(manifest.version).toBe('0.1.0');
    expect(Object.keys(manifest.paths)).toHaveLength(2);
    expect(manifest.index.path).toBe(Object.keys(manifest.paths)[0]);
  });

  it('normalizes and de-dupes generated paths', () => {
    const seen = new Set<string>();
    const one = createStableFilePath(new File(['x'], 'My File!.txt'), 0, seen);
    const two = createStableFilePath(new File(['x'], 'My File!.txt'), 1, seen);

    expect(one).toBe('001-my-file.txt');
    expect(two).toBe('002-my-file.txt');
    expect(one).not.toBe(two);
  });

  it('throws when tx count and file count diverge', () => {
    const files = [new File(['hello'], 'index.html')];
    expect(() => buildManifest(files, [])).toThrow(/must match/);
  });
});
