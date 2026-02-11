import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { SupportedNetwork } from '../types/domain';
import { supportedNetworks, getNetworkConfig } from '../config/networks';

interface WalletPanelProps {
  selectedNetwork: SupportedNetwork;
  onNetworkChange: (network: SupportedNetwork) => void;
  connected: boolean;
  addressLabel: string;
  chainMismatch: boolean;
  onSwitchChain: () => void;
}

export function WalletPanel(props: WalletPanelProps) {
  const {
    selectedNetwork,
    onNetworkChange,
    connected,
    addressLabel,
    chainMismatch,
    onSwitchChain,
  } = props;

  return (
    <section className="panel wallet-panel">
      <div className="panel-head">
        <h2>Wallet</h2>
        <ConnectButton chainStatus="name" showBalance={false} />
      </div>

      <div className="network-controls">
        <label htmlFor="network-select">Target network</label>
        <select
          id="network-select"
          value={selectedNetwork}
          onChange={(event) => onNetworkChange(event.target.value as SupportedNetwork)}
        >
          {supportedNetworks.map((network) => {
            const config = getNetworkConfig(network);
            return (
              <option value={network} key={network}>
                {config.label}
              </option>
            );
          })}
        </select>
      </div>

      <div className="wallet-meta">
        <p>
          <span>Status:</span> {connected ? 'Connected' : 'Disconnected'}
        </p>
        <p>
          <span>Account:</span> {addressLabel}
        </p>
      </div>

      {chainMismatch ? (
        <div className="warning-block">
          <p>Your wallet is on the wrong chain for the selected network.</p>
          <button type="button" onClick={onSwitchChain}>
            Switch to {getNetworkConfig(selectedNetwork).label}
          </button>
        </div>
      ) : null}
    </section>
  );
}
