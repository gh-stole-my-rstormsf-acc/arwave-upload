import type { Address, Chain } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import type { SupportedNetwork } from '../types/domain';

export interface NetworkConfig {
  key: SupportedNetwork;
  label: string;
  chain: Chain;
  rpcUrl: string;
  irysNodeUrl: string;
  ensRegistry: Address;
  ensNameWrapper: Address;
  ensSubgraphUrl?: string;
}

const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as Address;

const configMap: Record<SupportedNetwork, NetworkConfig> = {
  mainnet: {
    key: 'mainnet',
    label: 'Ethereum Mainnet',
    chain: mainnet,
    rpcUrl: import.meta.env.VITE_MAINNET_RPC_URL || 'https://rpc.ankr.com/eth',
    irysNodeUrl: import.meta.env.VITE_IRYS_MAINNET_NODE || 'https://uploader.irys.xyz',
    ensRegistry: ENS_REGISTRY_ADDRESS,
    ensNameWrapper: '0xD4416b13d2b3a9abae7AcD5D6C2BbDBE25686401' as Address,
    ensSubgraphUrl: import.meta.env.VITE_ENS_SUBGRAPH_MAINNET_URL || undefined,
  },
  sepolia: {
    key: 'sepolia',
    label: 'Sepolia',
    chain: sepolia,
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    irysNodeUrl: import.meta.env.VITE_IRYS_DEVNET_NODE || 'https://devnet.irys.xyz',
    ensRegistry: ENS_REGISTRY_ADDRESS,
    ensNameWrapper: '0x0635513f179D50A207757E05759CbD106d7dFcE8' as Address,
    ensSubgraphUrl: import.meta.env.VITE_ENS_SUBGRAPH_SEPOLIA_URL || undefined,
  },
};

export const supportedNetworks: SupportedNetwork[] = ['mainnet', 'sepolia'];

export function getNetworkConfig(network: SupportedNetwork): NetworkConfig {
  return configMap[network];
}

export function getNetworkByChainId(chainId: number): SupportedNetwork | null {
  if (chainId === mainnet.id) return 'mainnet';
  if (chainId === sepolia.id) return 'sepolia';
  return null;
}
