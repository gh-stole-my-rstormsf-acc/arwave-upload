import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import { useUploadFlow } from '../../hooks/useUploadFlow';

describe('useUploadFlow', () => {
  it('runs estimate -> upload -> ens link happy path', async () => {
    const estimateUploadCost = vi.fn(async () => ({
      wei: 100n,
      eth: '0.0000000000000001',
      totalBytes: 2,
      bufferedWei: 105n,
    }));

    const uploadBatch = vi.fn(async ({ onProgress }) => {
      onProgress?.({ stage: 'funding', current: 0, total: 1 });
      onProgress?.({ stage: 'uploading', current: 1, total: 1, fileName: 'a.txt' });
      return {
        fileTxIds: ['fileTx'],
        manifestTxId: 'manifestTx',
        totalBytes: 2,
        fundedWei: 105n,
      };
    });

    const linkManifestToEns = vi.fn(async () => ({
      subdomain: 'v1.demo.eth',
      node: '0xabc' as `0x${string}`,
      txHash: '0x123' as `0x${string}`,
      contenthashTxHash: '0x456' as `0x${string}`,
    }));

    const { result } = renderHook(() =>
      useUploadFlow(
        {
          network: 'sepolia',
          address: '0x1111111111111111111111111111111111111111' as Address,
          walletClient: {} as any,
          publicClient: {} as any,
        },
        {
          estimateUploadCost: estimateUploadCost as any,
          uploadBatch: uploadBatch as any,
          linkManifestToEns: linkManifestToEns as any,
        },
      ),
    );

    const files = [new File(['ok'], 'a.txt')];

    await act(async () => {
      await result.current.estimateFiles(files);
    });

    expect(result.current.estimate?.bufferedWei).toBe(105n);

    await act(async () => {
      await result.current.startUpload(files);
    });

    expect(result.current.uploadResult?.manifestTxId).toBe('manifestTx');
    expect(result.current.flowState).toBe('success');

    await act(async () => {
      await result.current.linkEns('demo.eth');
    });

    expect(result.current.ensResult?.subdomain).toBe('v1.demo.eth');
    expect(uploadBatch).toHaveBeenCalledTimes(1);
    expect(linkManifestToEns).toHaveBeenCalledTimes(1);
  });

  it('surfaces upload errors and supports retry flow', async () => {
    const failingUpload = vi
      .fn()
      .mockRejectedValueOnce(new Error('user rejected tx'))
      .mockResolvedValueOnce({
        fileTxIds: ['fileTx'],
        manifestTxId: 'manifestTx',
        totalBytes: 2,
        fundedWei: 105n,
      });

    const { result } = renderHook(() =>
      useUploadFlow(
        {
          network: 'sepolia',
          address: '0x1111111111111111111111111111111111111111' as Address,
          walletClient: {} as any,
          publicClient: {} as any,
        },
        {
          estimateUploadCost: vi.fn(async () => ({
            wei: 1n,
            eth: '0.000000000000000001',
            totalBytes: 2,
            bufferedWei: 2n,
          })) as any,
          uploadBatch: failingUpload as any,
          linkManifestToEns: vi.fn() as any,
        },
      ),
    );

    const files = [new File(['ok'], 'a.txt')];

    await act(async () => {
      await result.current.startUpload(files);
    });

    expect(result.current.flowState).toBe('error');
    expect(result.current.error).toContain('user rejected tx');

    await act(async () => {
      result.current.clearError();
      await result.current.startUpload(files);
    });

    expect(result.current.flowState).toBe('success');
    expect(result.current.uploadResult?.manifestTxId).toBe('manifestTx');
  });
});
