import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createConfig, WagmiProvider } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { http } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RainbowKitProvider,
  connectorsForWallets,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { metaMaskWallet } from '@rainbow-me/rainbowkit/wallets';
import '@rainbow-me/rainbowkit/styles.css';
import App from './App';
import './styles.css';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'local-dev-project-id';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Supported Wallet',
      wallets: [metaMaskWallet],
    },
  ],
  {
    appName: 'ARWave Upload',
    projectId,
  },
);

const config = createConfig({
  connectors,
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(import.meta.env.VITE_MAINNET_RPC_URL || 'https://rpc.ankr.com/eth'),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'),
  },
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#ff6f0f',
            accentColorForeground: '#101014',
            borderRadius: 'small',
            fontStack: 'rounded',
          })}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
