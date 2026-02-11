import { WebUploader } from '@irys/web-upload';
import { WebEthereum } from '@irys/web-upload-ethereum';
import { ViemV2Adapter } from '@irys/web-upload-ethereum-viem-v2';
import type { PublicClient, WalletClient } from 'viem';
import { getNetworkConfig } from '../config/networks';
import type {
  CostEstimate,
  SupportedNetwork,
  UploadBatchInput,
  UploadBatchResult,
  UploadProgress,
} from '../types/domain';
import { buildManifest, MANIFEST_CONTENT_TYPE } from './manifest';
import { calculateBufferedFunding, computeTotalBytes } from './validators';

export interface UploadBatchInputWithClients extends UploadBatchInput {
  walletClient: WalletClient;
  publicClient: PublicClient;
  onProgress?: (progress: UploadProgress) => void;
}

export interface EstimateUploadCostInput {
  files: File[];
  network: SupportedNetwork;
  walletClient: WalletClient;
  publicClient: PublicClient;
}

export async function buildIrysClient(
  network: SupportedNetwork,
  walletClient: WalletClient,
  publicClient: PublicClient,
) {
  const networkConfig = getNetworkConfig(network);

  return WebUploader(WebEthereum)
    .withAdapter(ViemV2Adapter(walletClient, { publicClient, accountIndex: 0 }))
    .bundlerUrl(networkConfig.irysNodeUrl)
    .withRpc(networkConfig.rpcUrl)
    .build();
}

export async function estimateUploadCost(input: EstimateUploadCostInput): Promise<CostEstimate> {
  const { files, network, walletClient, publicClient } = input;
  const irys = await buildIrysClient(network, walletClient, publicClient);

  const totalBytes = computeTotalBytes(files);
  const priceAtomic = await irys.getPrice(totalBytes);
  const wei = BigInt(priceAtomic.toFixed(0));
  const bufferedWei = calculateBufferedFunding(wei);
  const eth = irys.utils.fromAtomic(priceAtomic).toString(10);

  return {
    wei,
    eth,
    totalBytes,
    bufferedWei,
  };
}

export async function uploadBatch(input: UploadBatchInputWithClients): Promise<UploadBatchResult> {
  const { files, network, walletClient, publicClient, onProgress } = input;

  if (files.length === 0) {
    throw new Error('No files selected for upload.');
  }

  const irys = await buildIrysClient(network, walletClient, publicClient);
  const totalBytes = computeTotalBytes(files);

  onProgress?.({
    stage: 'funding',
    current: 0,
    total: files.length,
  });

  const priceAtomic = await irys.getPrice(totalBytes);
  const fundingAmountWei = calculateBufferedFunding(BigInt(priceAtomic.toFixed(0)));
  await irys.fund(fundingAmountWei.toString());

  const fileTxIds: string[] = [];

  for (const [index, file] of files.entries()) {
    onProgress?.({
      stage: 'uploading',
      current: index + 1,
      total: files.length,
      fileName: file.name,
    });

    const response = await irys.uploadFile(file);
    fileTxIds.push(response.id);
  }

  onProgress?.({
    stage: 'manifest',
    current: files.length,
    total: files.length,
  });

  const manifest = buildManifest(files, fileTxIds);
  const manifestResponse = await irys.upload(JSON.stringify(manifest), {
    tags: [{ name: 'Content-Type', value: MANIFEST_CONTENT_TYPE }],
  });

  return {
    fileTxIds,
    manifestTxId: manifestResponse.id,
    totalBytes,
    fundedWei: fundingAmountWei,
  };
}
