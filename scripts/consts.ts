import { Address } from 'viem'
import { FilterFunction, NetworkId, Protocol } from './types'
import { filterEvents as beefy } from './protocol-filters/beefy'

export const NETWORK_ID_TO_REGISTRY_ADDRESS = {
  [NetworkId['arbitrum-one']]: '0x5a1a1027aC1d828E7415AF7d797FBA2B0cDD5575',
  [NetworkId['base-mainnet']]: '0x5a1a1027aC1d828E7415AF7d797FBA2B0cDD5575',
  [NetworkId['celo-mainnet']]: '0x5a1a1027aC1d828E7415AF7d797FBA2B0cDD5575',
  [NetworkId['op-mainnet']]: '0x5a1a1027aC1d828E7415AF7d797FBA2B0cDD5575',
  [NetworkId['polygon-pos-mainnet']]:
    '0x5a1a1027aC1d828E7415AF7d797FBA2B0cDD5575',
} as Partial<Record<NetworkId, Address>>

export const protocolFilters: Record<Protocol, FilterFunction> = {
  Beefy: beefy,
}

export const supportedNetworkIds = [
  NetworkId['arbitrum-one'],
  NetworkId['base-mainnet'],
  NetworkId['celo-mainnet'],
  NetworkId['op-mainnet'],
  NetworkId['polygon-pos-mainnet'],
]
