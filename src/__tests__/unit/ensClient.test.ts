import { describe, expect, it } from 'vitest';
import { buildVersionLabel, encodeArweaveContenthash, findNextVersion } from '../../lib/ensClient';

describe('ensClient helpers', () => {
  it('creates deterministic version labels', () => {
    expect(buildVersionLabel(1)).toBe('v1');
    expect(buildVersionLabel(17)).toBe('v17');
  });

  it('encodes arweave tx id to resolver-ready contenthash', () => {
    const encoded = encodeArweaveContenthash('7cWDC27Q7D-GX9jfZWQck4JRTJJEmS2bWdOXLzxEtjc');
    expect(encoded.startsWith('0x')).toBe(true);
    expect(encoded.length).toBeGreaterThan(2);
  });

  it('returns first unowned vN subdomain candidate', async () => {
    const publicClient = {
      multicall: async () => [
        { status: 'success', result: '0x1111111111111111111111111111111111111111' },
        { status: 'success', result: '0x0000000000000000000000000000000000000000' },
      ],
    } as any;

    const suggestion = await findNextVersion({
      parentName: 'demo.eth',
      publicClient,
      network: 'sepolia',
    });

    expect(suggestion.label).toBe('v2');
    expect(suggestion.subdomain).toBe('v2.demo.eth');
  });
});
