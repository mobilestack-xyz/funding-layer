import { NetworkId } from './types'
import { registryContractAbi } from '../abis/Registry'
import ERC20Abi from './abis/ERC20'
import { mainnet, arbitrum, optimism, polygon, base, celo } from 'viem/chains'
import {
  createPublicClient,
  http,
  getContract,
  Address,
  PublicClient,
} from 'viem'

const NETWORK_ID_TO_VIEM_CLIENT = {
  [NetworkId['ethereum-mainnet']]: createPublicClient({
    chain: mainnet,
    transport: http(),
  }),
  [NetworkId['arbitrum-one']]: createPublicClient({
    chain: arbitrum,
    transport: http(),
  }),
  [NetworkId['op-mainnet']]: createPublicClient({
    chain: optimism,
    transport: http(),
  }),
  [NetworkId['celo-mainnet']]: createPublicClient({
    chain: celo,
    transport: http(),
  }),
  [NetworkId['polygon-pos-mainnet']]: createPublicClient({
    chain: polygon,
    transport: http(),
  }),
  [NetworkId['base-mainnet']]: createPublicClient({
    chain: base,
    transport: http(),
  }),
} as unknown as Partial<Record<NetworkId, PublicClient>>

/**
 * Gets a public Viem client for a given NetworkId
 */
export function getViemPublicClient(networkId: NetworkId) {
  const client = NETWORK_ID_TO_VIEM_CLIENT[networkId]
  if (!client) {
    throw new Error(`No viem client found for networkId: ${networkId}`)
  }
  return client
}

/**
 * Returns a contract object representing the registry
 */
export async function getRegistryContract(
  registryAddress: Address,
  networkId: NetworkId,
) {
  const client = getViemPublicClient(networkId)
  return getContract({
    address: registryAddress,
    abi: registryContractAbi,
    client,
  })
}

export async function getErc20Contract(address: Address, networkId: NetworkId) {
  const client = getViemPublicClient(networkId)
  return getContract({
    address: address,
    abi: ERC20Abi,
    client,
  })
}
