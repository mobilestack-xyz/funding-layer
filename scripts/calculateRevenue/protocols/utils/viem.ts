import { NetworkId } from '../../../types'
import beefyVaultV7Abi from '../../../abis/BeefyVaultV7'
import stratFeeManagerAbi from '../../../abis/StratFeeManagerInitializable'
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
 * For a given vault, returns a contract object representing the strategy
 * contract associated with it.
 */
export async function getStrategyContract(
  vaultAddress: Address,
  networkId: NetworkId,
) {
  const client = getViemPublicClient(networkId)
  const vaultContract = getContract({
    address: vaultAddress,
    abi: beefyVaultV7Abi,
    client,
  })
  const strategyAddress = await vaultContract.read.strategy()
  return getContract({
    address: strategyAddress,
    abi: stratFeeManagerAbi,
    client,
  })
}
