import { encode as encodeContenthash } from '@ensdomains/content-hash';
import {
  labelhash,
  namehash,
  parseAbi,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { getNetworkConfig } from '../config/networks';
import type { EnsLinkRequest, EnsLinkResult, EnsNameCandidate, SupportedNetwork } from '../types/domain';

const ENS_REGISTRY_ABI = parseAbi([
  'function owner(bytes32 node) view returns (address)',
  'function resolver(bytes32 node) view returns (address)',
  'function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)',
]);

const NAME_WRAPPER_ABI = parseAbi([
  'function getData(uint256 id) view returns (address owner, uint32 fuses, uint64 expiry)',
  'function setSubnodeRecord(bytes32 parentNode, string label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry)',
]);

const PUBLIC_RESOLVER_ABI = parseAbi([
  'function setContenthash(bytes32 node, bytes hash)',
]);

interface EnsSubgraphResponse {
  data?: {
    account?: {
      domains?: { name: string }[];
      registrations?: { domain?: { name?: string } }[];
    };
    domains?: { name?: string }[];
  };
}

export interface CandidateEnsNameInput {
  address: Address;
  publicClient: PublicClient;
  subgraphUrl?: string;
}

function normalizeEnsName(name: string): string {
  return name.trim().toLowerCase().replace(/\.$/, '');
}

function isEthName(name: string): boolean {
  const normalized = normalizeEnsName(name);
  return normalized.endsWith('.eth') && normalized.split('.').length >= 2;
}

export function buildVersionLabel(index: number): string {
  return `v${index}`;
}

export function encodeArweaveContenthash(txId: string): Hex {
  const encoded = encodeContenthash('arweave', txId);
  return (`0x${encoded}` as Hex);
}

async function fetchSubgraphEnsNames(subgraphUrl: string, address: Address): Promise<string[]> {
  const normalizedAddress = address.toLowerCase();
  const query = {
    query: `
      query AccountNames($id: ID!) {
        account(id: $id) {
          domains(first: 50) {
            name
          }
          registrations(first: 50) {
            domain {
              name
            }
          }
        }
      }
    `,
    variables: { id: normalizedAddress },
  };

  const response = await fetch(subgraphUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error(`ENS subgraph request failed: ${response.status}`);
  }

  const payload = (await response.json()) as EnsSubgraphResponse;
  const account = payload.data?.account;
  if (!account) return [];

  const names = new Set<string>();

  for (const item of account.domains ?? []) {
    if (item.name && isEthName(item.name)) {
      names.add(normalizeEnsName(item.name));
    }
  }

  for (const item of account.registrations ?? []) {
    const name = item.domain?.name;
    if (name && isEthName(name)) {
      names.add(normalizeEnsName(name));
    }
  }

  return [...names];
}

export async function getCandidateEnsNames(input: CandidateEnsNameInput): Promise<EnsNameCandidate[]> {
  const { address, publicClient, subgraphUrl } = input;
  const candidates = new Map<string, EnsNameCandidate['source']>();

  try {
    const reverse = await publicClient.getEnsName({ address });
    if (reverse && isEthName(reverse)) {
      candidates.set(normalizeEnsName(reverse), 'reverse');
    }
  } catch {
    // Keep reverse lookup failures non-fatal.
  }

  if (subgraphUrl) {
    try {
      const fromSubgraph = await fetchSubgraphEnsNames(subgraphUrl, address);
      for (const name of fromSubgraph) {
        if (!candidates.has(name)) {
          candidates.set(name, 'subgraph');
        }
      }
    } catch {
      // Subgraph is optional and may be unavailable.
    }
  }

  return [...candidates.entries()].map(([name, source]) => ({ name, source }));
}

export interface FindNextVersionInput {
  parentName: string;
  publicClient: PublicClient;
  network: SupportedNetwork;
}

export interface EnsVersionSuggestion {
  label: string;
  index: number;
  subdomain: string;
  node: Hex;
}

export async function findNextVersion(input: FindNextVersionInput): Promise<EnsVersionSuggestion> {
  const parentName = normalizeEnsName(input.parentName);

  if (!isEthName(parentName)) {
    throw new Error('ENS parent name must be a valid .eth name.');
  }

  const { ensRegistry } = getNetworkConfig(input.network);
  const contracts = Array.from({ length: 100 }, (_, index) => {
    const versionIndex = index + 1;
    const label = buildVersionLabel(versionIndex);
    const subdomain = `${label}.${parentName}`;
    const node = namehash(subdomain);

    return {
      label,
      versionIndex,
      subdomain,
      node,
      contract: {
        address: ensRegistry,
        abi: ENS_REGISTRY_ABI,
        functionName: 'owner' as const,
        args: [node] as const,
      },
    };
  });

  const responses = await input.publicClient.multicall({
    contracts: contracts.map((item) => item.contract),
    allowFailure: true,
  });

  for (const [index, response] of responses.entries()) {
    const owner = response.status === 'success' ? response.result : undefined;
    if (!owner || owner === zeroAddress) {
      const candidate = contracts[index];
      if (!candidate) {
        continue;
      }
      return {
        label: candidate.label,
        index: candidate.versionIndex,
        subdomain: candidate.subdomain,
        node: candidate.node,
      };
    }
  }

  throw new Error('No available vN subdomain labels found in range v1-v100.');
}

interface LinkManifestInput extends EnsLinkRequest {
  publicClient: PublicClient;
  walletClient: WalletClient;
}

async function createSubnodeWithWrapperFirst(params: {
  parentNode: Hex;
  label: string;
  owner: Address;
  resolver: Address;
  publicClient: PublicClient;
  walletClient: WalletClient;
  network: SupportedNetwork;
}): Promise<Hex> {
  const networkConfig = getNetworkConfig(params.network);

  let expiry = BigInt(Math.floor(Date.now() / 1000) + 31_536_000);
  try {
    const data = await params.publicClient.readContract({
      address: networkConfig.ensNameWrapper,
      abi: NAME_WRAPPER_ABI,
      functionName: 'getData',
      args: [BigInt(params.parentNode)],
    });
    if (data[2] > 0n) {
      expiry = data[2];
    }
  } catch {
    // If read fails, fallback uses a default expiry.
  }

  try {
    const simulation = await params.publicClient.simulateContract({
      account: params.owner,
      address: networkConfig.ensNameWrapper,
      abi: NAME_WRAPPER_ABI,
      functionName: 'setSubnodeRecord',
      args: [params.parentNode, params.label, params.owner, params.resolver, 0n, 0, expiry],
    });

    const txHash = await params.walletClient.writeContract(simulation.request);
    await params.publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  } catch {
    const fallbackSimulation = await params.publicClient.simulateContract({
      account: params.owner,
      address: networkConfig.ensRegistry,
      abi: ENS_REGISTRY_ABI,
      functionName: 'setSubnodeRecord',
      args: [params.parentNode, labelhash(params.label), params.owner, params.resolver, 0n],
    });

    const txHash = await params.walletClient.writeContract(fallbackSimulation.request);
    await params.publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }
}

export async function linkManifestToEns(input: LinkManifestInput): Promise<EnsLinkResult> {
  const parentName = normalizeEnsName(input.parentName);

  if (!isEthName(parentName)) {
    throw new Error('Only .eth ENS parent names are supported in v1.');
  }

  const networkConfig = getNetworkConfig(input.network);
  const parentNode = namehash(parentName);

  const resolver = await input.publicClient.readContract({
    address: networkConfig.ensRegistry,
    abi: ENS_REGISTRY_ABI,
    functionName: 'resolver',
    args: [parentNode],
  });

  if (!resolver || resolver === zeroAddress) {
    throw new Error('Selected ENS parent has no resolver configured.');
  }

  const suggestion = await findNextVersion({
    parentName,
    publicClient: input.publicClient,
    network: input.network,
  });

  const txHash = await createSubnodeWithWrapperFirst({
    parentNode,
    label: suggestion.label,
    owner: input.owner,
    resolver,
    publicClient: input.publicClient,
    walletClient: input.walletClient,
    network: input.network,
  });

  const encodedContenthash = encodeArweaveContenthash(input.manifestTxId);
  const resolverSimulation = await input.publicClient.simulateContract({
    account: input.owner,
    address: resolver,
    abi: PUBLIC_RESOLVER_ABI,
    functionName: 'setContenthash',
    args: [suggestion.node, encodedContenthash],
  });

  const contenthashTxHash = await input.walletClient.writeContract(resolverSimulation.request);
  await input.publicClient.waitForTransactionReceipt({ hash: contenthashTxHash });

  return {
    subdomain: suggestion.subdomain,
    node: suggestion.node,
    txHash,
    contenthashTxHash,
  };
}
