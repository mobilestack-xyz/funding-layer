export const protocols = ['Beefy'] as const
export type Protocol = (typeof protocols)[number]
export type FilterFunction = (
  events: ReferralEvent[],
) => Promise<ReferralEvent[]>

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

export interface TokenPriceData {
  priceUsd: string
  priceFetchedAt: number
}

export type CalculateRevenueFn = (params: {
  address: string
  startTimestamp: Date
  endTimestamp: Date
}) => Promise<number>

export interface ReferralEvent {
  userAddress: string
  timestamp: number
  referrerId: string
  protocol: Protocol
}
