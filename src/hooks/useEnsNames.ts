import { useCallback, useEffect, useState } from 'react';
import type { Address, PublicClient } from 'viem';
import { getNetworkConfig } from '../config/networks';
import type { EnsNameCandidate, SupportedNetwork } from '../types/domain';
import { getCandidateEnsNames } from '../lib/ensClient';

interface UseEnsNamesParams {
  address?: Address;
  network: SupportedNetwork;
  publicClient?: PublicClient;
}

export function useEnsNames(params: UseEnsNamesParams) {
  const { address, network, publicClient } = params;

  const [names, setNames] = useState<EnsNameCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address || !publicClient) {
      setNames([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const networkConfig = getNetworkConfig(network);
      const discovered = await getCandidateEnsNames({
        address,
        publicClient,
        subgraphUrl: networkConfig.ensSubgraphUrl,
      });
      setNames(discovered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ENS names.');
    } finally {
      setLoading(false);
    }
  }, [address, network, publicClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    names,
    loading,
    error,
    refresh,
  };
}
