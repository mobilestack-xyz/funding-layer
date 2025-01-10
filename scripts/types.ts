export const protocols = ['Beefy'] as const
export type Protocol = (typeof protocols)[number]

export enum NetworkId {
  'celo-mainnet' = 'celo-mainnet',
  'celo-alfajores' = 'celo-alfajores',
  'ethereum-mainnet' = 'ethereum-mainnet',
  'ethereum-sepolia' = 'ethereum-sepolia',
  'arbitrum-one' = 'arbitrum-one',
  'arbitrum-sepolia' = 'arbitrum-sepolia',
  'op-mainnet' = 'op-mainnet',
  'op-sepolia' = 'op-sepolia',
  'polygon-pos-mainnet' = 'polygon-pos-mainnet',
  'polygon-pos-amoy' = 'polygon-pos-amoy',
  'base-mainnet' = 'base-mainnet',
  'base-sepolia' = 'base-sepolia',
}

// Protocols may generate revenue in different denominations,
// this is a map from tokenIds to revenue generated for a
// protocol, denominated in units of the token; these maps
// are organized by NetworkId
export type RevenueResult = Partial<Record<NetworkId, Record<string, string>>>

export type CalculateRevenueFn = (
  address: string,
  startTimestamp: Date,
  endTimestamp: Date,
) => Promise<RevenueResult>

export interface ReferralEvent {
  userAddress: string
  timestamp: number
}
