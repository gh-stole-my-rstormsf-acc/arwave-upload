import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi';
import { getNetworkConfig } from './config/networks';
import { FilePicker } from './components/FilePicker';
import { CostPanel } from './components/CostPanel';
import { EnsLinkPanel } from './components/EnsLinkPanel';
import { ResultPanel } from './components/ResultPanel';
import { WalletPanel } from './components/WalletPanel';
import { findNextVersion } from './lib/ensClient';
import { validateSelectedFiles } from './lib/validators';
import { useEnsNames } from './hooks/useEnsNames';
import { useUploadFlow } from './hooks/useUploadFlow';
import type { SupportedNetwork } from './types/domain';

function truncateAddress(address?: string): string {
  if (!address) return 'n/a';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function App() {
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedNetwork>('sepolia');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedEnsName, setSelectedEnsName] = useState('');
  const [suggestedLabel, setSuggestedLabel] = useState<string | undefined>(undefined);

  const networkConfig = getNetworkConfig(selectedNetwork);

  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: networkConfig.chain.id });
  const publicClient = usePublicClient({ chainId: networkConfig.chain.id });
  const { switchChainAsync } = useSwitchChain();

  const chainMismatch = isConnected && chainId !== networkConfig.chain.id;
  const addressLabel = truncateAddress(address);

  const ensNames = useEnsNames({
    address,
    network: selectedNetwork,
    publicClient,
  });

  const {
    flowState,
    estimate,
    progress,
    uploadResult,
    ensResult,
    error,
    estimateFiles,
    startUpload,
    linkEns,
    clearError,
  } = useUploadFlow({
    network: selectedNetwork,
    address,
    walletClient,
    publicClient,
  });

  const validation = useMemo(() => validateSelectedFiles(files), [files]);
  const canEstimate = isConnected && !chainMismatch && Boolean(walletClient && publicClient);

  const activeEnsName = useMemo(() => {
    if (selectedEnsName && ensNames.names.some((candidate) => candidate.name === selectedEnsName)) {
      return selectedEnsName;
    }
    return ensNames.names[0]?.name ?? '';
  }, [ensNames.names, selectedEnsName]);

  useEffect(() => {
    if (!canEstimate || files.length === 0 || !validation.valid) {
      return;
    }

    void estimateFiles(files);
  }, [canEstimate, estimateFiles, files, validation.valid]);

  useEffect(() => {
    async function fetchSuggestion() {
      if (!activeEnsName || !publicClient || !uploadResult) {
        setSuggestedLabel(undefined);
        return;
      }

      try {
        const suggestion = await findNextVersion({
          parentName: activeEnsName,
          publicClient,
          network: selectedNetwork,
        });
        setSuggestedLabel(suggestion.label);
      } catch {
        setSuggestedLabel(undefined);
      }
    }

    void fetchSuggestion();
  }, [activeEnsName, selectedNetwork, publicClient, uploadResult]);

  async function switchToTargetChain() {
    await switchChainAsync({ chainId: networkConfig.chain.id });
  }

  function handleFileSelection(nextFiles: File[]) {
    setFiles(nextFiles);
  }

  const canUpload = validation.valid && validation.totalBytes > 0 && canEstimate;
  const canLinkEns = Boolean(uploadResult && activeEnsName && !chainMismatch);

  return (
    <main className="app-shell">
      <header>
        <div>
          <p className="kicker">ArDrive-inspired MVP</p>
          <h1>ARWave Upload</h1>
        </div>
        <p className="subtitle">Upload to Arweave with ETH, then bind each upload to a versioned ENS subdomain.</p>
      </header>

      <div className="grid-layout">
        <WalletPanel
          selectedNetwork={selectedNetwork}
          onNetworkChange={setSelectedNetwork}
          connected={isConnected}
          addressLabel={addressLabel}
          chainMismatch={Boolean(chainMismatch)}
          onSwitchChain={switchToTargetChain}
        />

        <FilePicker files={files} validation={validation} onSelectFiles={handleFileSelection} />

        <CostPanel
          estimate={estimate}
          progress={progress}
          flowState={flowState}
          canUpload={canUpload}
          onUpload={() => startUpload(files)}
        />

        <EnsLinkPanel
          ensNames={ensNames.names}
          selectedName={activeEnsName}
          onSelectedNameChange={setSelectedEnsName}
          suggestedLabel={suggestedLabel}
          flowState={flowState}
          enabled={canLinkEns}
          onLink={() => linkEns(activeEnsName)}
        />

        <ResultPanel
          uploadResult={uploadResult}
          ensResult={ensResult}
          network={selectedNetwork}
        />
      </div>

      {ensNames.error ? <p className="error-banner">ENS lookup error: {ensNames.error}</p> : null}
      {error ? (
        <div className="error-banner">
          <p>{error}</p>
          <button type="button" onClick={clearError}>
            Dismiss
          </button>
        </div>
      ) : null}
    </main>
  );
}
