import { NetworkId } from '../../../types'
import { fetchWithTimeout } from '../../../utils/fetchWithTimeout'
import { getStrategyContract } from '../utils/viem'
import { getViemPublicClient } from '../../../utils'
import { Address } from 'viem'
import { BlockTimestampData, FeeEvent, BeefyVaultTvlData } from './types'
import memoize from '@github/memoize'

const BEEFY_API_URL = 'https://databarn.beefy.com/api/v1/beefy'
const DEFI_LLAMA_API_URL = 'https://coins.llama.fi'

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000

const NETWORK_ID_TO_DEFI_LLAMA_CHAIN: Partial<{
  [networkId in NetworkId]: string // eslint-disable-line @typescript-eslint/no-unused-vars
}> = {
  [NetworkId['ethereum-mainnet']]: 'ethereum',
  [NetworkId['arbitrum-one']]: 'arbitrum',
  [NetworkId['op-mainnet']]: 'optimism',
  [NetworkId['celo-mainnet']]: 'celo',
  [NetworkId['polygon-pos-mainnet']]: 'polygon',
  [NetworkId['base-mainnet']]: 'base',
}

export async function _getNearestBlock(
  networkId: NetworkId,
  timestamp: Date,
): Promise<number> {
  const unixTimestamp = Math.floor(timestamp.getTime() / 1000)
  const defiLlamaChain = NETWORK_ID_TO_DEFI_LLAMA_CHAIN[networkId]

  const response = await fetchWithTimeout(
    `${DEFI_LLAMA_API_URL}/block/${defiLlamaChain}/${unixTimestamp}`,
  )
  if (!response.ok) {
    throw new Error(
      `Error while fetching block timestamp from DefiLlama: ${response}`,
    )
  }
  const blockTimestampData = (await response.json()) as BlockTimestampData
  return blockTimestampData.height
}

export const getNearestBlock = memoize(_getNearestBlock, {
  hash: (...params: Parameters<typeof _getNearestBlock>) => params.join(','),
})

/**
 * For a given vault, fetches the record of all ChargedFee events emitted in a given timeframe
 */
export async function _fetchFeeEvents({
  vaultAddress,
  networkId,
  startTimestamp,
  endTimestamp,
}: {
  vaultAddress: Address
  networkId: NetworkId
  startTimestamp: Date
  endTimestamp: Date
}): Promise<FeeEvent[]> {
  const client = getViemPublicClient(networkId)
  const strategyContract = await getStrategyContract(vaultAddress, networkId)

  const startBlock = await getNearestBlock(networkId, startTimestamp)
  const endBlock = await getNearestBlock(networkId, endTimestamp)
  const blocksPer = 10000
  let currentBlock = startBlock

  const feeEvents: FeeEvent[] = []

  while (currentBlock <= endBlock) {
    const toBlock = Math.min(currentBlock + blocksPer, endBlock)
    const feeLogEvents = await strategyContract.getEvents.ChargedFees({
      fromBlock: BigInt(currentBlock),
      toBlock: BigInt(toBlock),
    })
    for (const feeLog of feeLogEvents) {
      const block = await client.getBlock({
        blockNumber: feeLog.blockNumber,
      })
      feeEvents.push({
        beefyFee: feeLog.args.beefyFees ?? 0,
        timestamp: new Date(Number(block.timestamp * 1000n)),
      })
    }
    currentBlock = toBlock + 1
  }
  return feeEvents
}

export const fetchFeeEvents = memoize(_fetchFeeEvents, {
  hash: (...params: Parameters<typeof _fetchFeeEvents>) =>
    Object.values(params[0]).join(','),
})

/**
 * For a given vault and date range, fetches historical time-series information about the TVL of the vault.
 * The TVL data consists of 15-minute snapshots.
 */
export async function _fetchVaultTvlHistory({
  vaultAddress,
  beefyChain,
  startTimestamp,
  endTimestamp,
}: {
  vaultAddress: string
  beefyChain: string
  startTimestamp: Date
  endTimestamp: Date
}): Promise<BeefyVaultTvlData[]> {
  // This endpoint accepts a maximum of one-week long spans.
  // We need to break down the provided date range into week-long durations.
  const timestamps = []
  let startSectionTimestamp = startTimestamp
  while (startSectionTimestamp < endTimestamp) {
    const startPlusOneWeekTimestamp = new Date(
      startSectionTimestamp.getTime() + ONE_WEEK,
    )
    const endSectionTimestamp =
      startPlusOneWeekTimestamp < endTimestamp
        ? startPlusOneWeekTimestamp
        : endTimestamp
    timestamps.push([startSectionTimestamp, endSectionTimestamp])
    startSectionTimestamp = endSectionTimestamp
  }

  const data = []
  for (const [t1, t2] of timestamps) {
    const queryParams = new URLSearchParams({
      from_date_utc: t1.toISOString(),
      to_date_utc: t2.toISOString(),
    })
    const response = await fetchWithTimeout(
      `${BEEFY_API_URL}/product/${beefyChain}/${vaultAddress}/tvl?${queryParams}`,
    )
    if (!response.ok) {
      throw new Error(
        `Error while fetching vault TVL data from Beefy: ${response}`,
      )
    }
    const vaultTvlData = (await response.json()) as BeefyVaultTvlData[]
    data.push(...vaultTvlData)
  }
  return data
}

export const fetchVaultTvlHistory = memoize(_fetchVaultTvlHistory, {
  hash: (...params: Parameters<typeof _fetchVaultTvlHistory>) =>
    Object.values(params[0]).join(','),
})
