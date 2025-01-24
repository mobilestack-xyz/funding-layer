import { Address } from 'viem'
import { NetworkId } from './types'

export const NETWORK_ID_TO_REGISTRY_ADDRESS = {
  [NetworkId['arbitrum-one']]: '0x0',
  [NetworkId['base-mainnet']]: '0x0',
  [NetworkId['celo-mainnet']]: '0x0',
  [NetworkId['op-mainnet']]: '0x0',
  [NetworkId['polygon-pos-mainnet']]: '0x0',
} as Partial<Record<NetworkId, Address>>

export const supportedNetworkIds = [
  NetworkId['arbitrum-one'],
  NetworkId['base-mainnet'],
  NetworkId['celo-mainnet'],
  NetworkId['op-mainnet'],
  NetworkId['polygon-pos-mainnet'],
]
