import { fetchInvestorTimeline } from '../../../protocol-filters/beefy'
import { VaultsInfo, BeefyInvestorTransactionWithUsdBalance } from './types'
import { getAddress } from 'viem'
import { fetchVaultTvlHistory, fetchFeeEvents } from './helpers'
import { NetworkId } from '../../../types'

const BEEFY_CHAIN_TO_NETWORK_ID: Record<string, NetworkId> = {
  ethereum: NetworkId['ethereum-mainnet'],
  arbitrum: NetworkId['arbitrum-one'],
  optimism: NetworkId['op-mainnet'],
  polygon: NetworkId['polygon-pos-mainnet'],
  base: NetworkId['base-mainnet'],
}

/**
 * Gets all relevant information for all vaults a user is part of, over a given date range.
 * In particular, fetches per-vault data concerning:
 * - The user's TVL in the vault
 * - The total TVL in the vault
 * - A record of all fees charged on the vault
 */
export async function getVaults(
  address: string,
  startTimestamp: Date,
  endTimestamp: Date,
): Promise<VaultsInfo> {
  const portfolioData = (await fetchInvestorTimeline(address)).filter(
    (tx) => tx.usd_balance !== null,
  ) as BeefyInvestorTransactionWithUsdBalance[]

  // NOTE: We do not filter the portfolio transaction data across the given date range. If we did, and the user
  // did not interact with some vault over the time range, but already had funds locked in it, filtering based
  // on transaction time would cause the vault to be silently ignored.

  const allVaults = portfolioData.reduce(
    (vaults, data) => vaults.add(data.product_key),
    new Set<string>(),
  )

  const vaultsInfo: VaultsInfo = {}

  for (const vault of allVaults) {
    // Ensure that per-vault transaction history is sorted oldest to newest.
    const txHistory = portfolioData
      .filter((data) => data.product_key === vault)
      .sort((a, b) => {
        if (new Date(a.datetime) < new Date(b.datetime)) return -1
        if (new Date(a.datetime) > new Date(b.datetime)) return 1
        return 0
      })

    const beefyChain = txHistory[0].chain
    const networkId = BEEFY_CHAIN_TO_NETWORK_ID[beefyChain]
    const vaultAddress = getAddress(vault.split(':').at(-1) as string)
    vaultsInfo[vault] = {
      networkId,
      vaultAddress,
      txHistory,
      vaultTvlHistory: await fetchVaultTvlHistory(
        vaultAddress,
        beefyChain,
        startTimestamp,
        endTimestamp,
      ),
      feeEvents: await fetchFeeEvents(
        vaultAddress,
        networkId,
        startTimestamp,
        endTimestamp,
      ),
    }
  }
  return vaultsInfo
}
