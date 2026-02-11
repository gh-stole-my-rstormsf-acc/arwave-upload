export const MANIFEST_CONTENT_TYPE = 'application/x.arweave-manifest+json';

export interface ArweavePathManifest {
  manifest: 'arweave/paths';
  version: '0.1.0';
  index: { path: string };
  paths: Record<string, { id: string }>;
}

function normalizePathSegment(rawName: string): string {
  return rawName
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();
}

function dedupePath(path: string, seen: Set<string>): string {
  if (!seen.has(path)) {
    seen.add(path);
    return path;
  }

  let suffix = 2;
  let candidate = `${path}-${suffix}`;
  while (seen.has(candidate)) {
    suffix += 1;
    candidate = `${path}-${suffix}`;
  }

  seen.add(candidate);
  return candidate;
}

export function createStableFilePath(file: File, index: number, seen: Set<string>): string {
  const normalized = normalizePathSegment(file.name || `file-${index + 1}`) || `file-${index + 1}`;
  const prefixed = `${String(index + 1).padStart(3, '0')}-${normalized}`;
  return dedupePath(prefixed, seen);
}

export function buildManifest(files: File[], fileTxIds: string[]): ArweavePathManifest {
  if (files.length === 0) throw new Error('Cannot build manifest with zero files.');
  if (files.length !== fileTxIds.length) {
    throw new Error('File count and transaction count must match.');
  }

  const seen = new Set<string>();
  const paths: Record<string, { id: string }> = {};

  for (const [index, file] of files.entries()) {
    const txId = fileTxIds[index];
    if (!txId) throw new Error(`Missing transaction ID for file ${file.name}.`);

    const stablePath = createStableFilePath(file, index, seen);
    paths[stablePath] = { id: txId };
  }

  const indexPath = Object.keys(paths)[0];
  if (!indexPath) {
    throw new Error('Manifest index path could not be determined.');
  }

  return {
    manifest: 'arweave/paths',
    version: '0.1.0',
    index: { path: indexPath },
    paths,
  };
}
