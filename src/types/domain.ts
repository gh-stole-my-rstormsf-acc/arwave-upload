import type { Address, Hex } from 'viem';

export type SupportedNetwork = 'mainnet' | 'sepolia';

export type FlowState =
  | 'idle'
  | 'estimating'
  | 'funding'
  | 'uploading'
  | 'linking'
  | 'success'
  | 'error';

export interface UploadBatchInput {
  files: File[];
  network: SupportedNetwork;
}

export interface UploadBatchResult {
  fileTxIds: string[];
  manifestTxId: string;
  totalBytes: number;
  fundedWei: bigint;
}

export interface EnsNameCandidate {
  name: string;
  source: 'reverse' | 'subgraph';
}

export interface EnsLinkRequest {
  parentName: string;
  manifestTxId: string;
  owner: Address;
  network: SupportedNetwork;
}

export interface EnsLinkResult {
  subdomain: string;
  node: Hex;
  txHash: Hex;
  contenthashTxHash: Hex;
}

export interface CostEstimate {
  wei: bigint;
  eth: string;
  totalBytes: number;
  bufferedWei: bigint;
}

export interface UploadProgress {
  stage: 'funding' | 'uploading' | 'manifest';
  current: number;
  total: number;
  fileName?: string;
}

export interface FileValidationResult {
  valid: boolean;
  totalBytes: number;
  errors: string[];
}
