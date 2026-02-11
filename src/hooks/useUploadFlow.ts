import { useCallback, useMemo, useState } from 'react';
import type { Address, PublicClient, WalletClient } from 'viem';
import type {
  CostEstimate,
  EnsLinkResult,
  FlowState,
  SupportedNetwork,
  UploadBatchResult,
  UploadProgress,
} from '../types/domain';
import { estimateUploadCost, uploadBatch } from '../lib/irysClient';
import { linkManifestToEns } from '../lib/ensClient';

interface UseUploadFlowParams {
  network: SupportedNetwork;
  address?: Address;
  walletClient?: WalletClient;
  publicClient?: PublicClient;
}

interface UploadFlowAdapters {
  estimateUploadCost: typeof estimateUploadCost;
  uploadBatch: typeof uploadBatch;
  linkManifestToEns: typeof linkManifestToEns;
}

const defaultAdapters: UploadFlowAdapters = {
  estimateUploadCost,
  uploadBatch,
  linkManifestToEns,
};

function normalizeError(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UploadFlowState {
  flowState: FlowState;
  estimate: CostEstimate | null;
  progress: UploadProgress | null;
  uploadResult: UploadBatchResult | null;
  ensResult: EnsLinkResult | null;
  error: string | null;
  estimateFiles: (files: File[]) => Promise<void>;
  startUpload: (files: File[]) => Promise<void>;
  linkEns: (parentName: string) => Promise<void>;
  clearError: () => void;
}

export function useUploadFlow(
  params: UseUploadFlowParams,
  adapters: UploadFlowAdapters = defaultAdapters,
): UploadFlowState {
  const { address, network, walletClient, publicClient } = params;

  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadBatchResult | null>(null);
  const [ensResult, setEnsResult] = useState<EnsLinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isReady = useMemo(
    () => Boolean(address && walletClient && publicClient),
    [address, walletClient, publicClient],
  );

  const estimateFiles = useCallback(async (files: File[]): Promise<void> => {
    if (!isReady || !walletClient || !publicClient) {
      setError('Connect MetaMask on the selected network first.');
      setFlowState('error');
      return;
    }

    setFlowState('estimating');
    setError(null);

    try {
      const nextEstimate = await adapters.estimateUploadCost({
        files,
        network,
        walletClient,
        publicClient,
      });
      setEstimate(nextEstimate);
      setFlowState('idle');
    } catch (err) {
      setError(normalizeError(err, 'Failed to estimate upload cost.'));
      setFlowState('error');
    }
  }, [adapters, isReady, network, publicClient, walletClient]);

  const startUpload = useCallback(async (files: File[]): Promise<void> => {
    if (!isReady || !walletClient || !publicClient) {
      setError('Connect MetaMask on the selected network first.');
      setFlowState('error');
      return;
    }

    setError(null);
    setEnsResult(null);
    setProgress(null);
    setFlowState('funding');

    try {
      const result = await adapters.uploadBatch({
        files,
        network,
        walletClient,
        publicClient,
        onProgress(nextProgress) {
          setProgress(nextProgress);
          if (nextProgress.stage === 'funding') {
            setFlowState('funding');
          } else {
            setFlowState('uploading');
          }
        },
      });

      setUploadResult(result);
      setFlowState('success');
    } catch (err) {
      setError(normalizeError(err, 'Upload failed.'));
      setFlowState('error');
    }
  }, [adapters, isReady, network, publicClient, walletClient]);

  const linkEns = useCallback(async (parentName: string): Promise<void> => {
    if (!isReady || !walletClient || !publicClient || !address) {
      setError('Connect MetaMask on the selected network first.');
      setFlowState('error');
      return;
    }

    if (!uploadResult) {
      setError('Upload files first before linking ENS.');
      setFlowState('error');
      return;
    }

    setError(null);
    setFlowState('linking');

    try {
      const linked = await adapters.linkManifestToEns({
        parentName,
        manifestTxId: uploadResult.manifestTxId,
        owner: address,
        network,
        publicClient,
        walletClient,
      });
      setEnsResult(linked);
      setFlowState('success');
    } catch (err) {
      setError(normalizeError(err, 'Failed to link ENS subdomain.'));
      setFlowState('error');
    }
  }, [address, adapters, isReady, network, publicClient, uploadResult, walletClient]);

  return {
    flowState,
    estimate,
    progress,
    uploadResult,
    ensResult,
    error,
    estimateFiles,
    startUpload,
    linkEns,
    clearError() {
      setError(null);
      if (flowState === 'error') {
        setFlowState(uploadResult ? 'success' : 'idle');
      }
    },
  };
}
