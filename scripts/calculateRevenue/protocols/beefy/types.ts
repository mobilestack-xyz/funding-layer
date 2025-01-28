import { BeefyInvestorTransaction } from '../../../protocolFilters/beefy'
import { Address } from 'viem'
import { NetworkId } from '../../../types'

export interface BlockTimestampData {
  height: number
  timestamp: number
}

export interface FeeEvent {
  beefyFee: number | bigint
  timestamp: Date
}

export type BeefyInvestorTransactionWithUsdBalance =
  BeefyInvestorTransaction & {
    usd_balance: number
  }

export interface VaultInfo {
  networkId: NetworkId
  vaultAddress: Address
  txHistory: BeefyInvestorTransactionWithUsdBalance[]
  vaultTvlHistory: BeefyVaultTvlData[]
  feeEvents: FeeEvent[]
}

export type VaultsInfo = Record<string, VaultInfo>

export type BeefyVaultTvlData = [string, number]
