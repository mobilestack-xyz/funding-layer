import { RevenueResult, NetworkId } from '../../types'
import { fetchWithTimeout } from '../../utils/fetchWithTimeout'
import beefyVaultV7Abi from '../../abis/BeefyVaultV7'
import stratFeeManagerAbi from '../../abis/StratFeeManagerInitializable'
import {
  createPublicClient,
  http,
  getContract,
  getAddress,
  PublicClient,
} from 'viem'
import { mainnet, arbitrum, optimism, polygon, base, celo } from 'viem/chains'

interface BeefyPortfolioData {
  datetime: string
  product_key: string
  display_name: string
  chain: string
  is_eol: boolean
  is_dashboard_eol: boolean
  transaction_hash: boolean
  share_to_underlying_price: number
  underlying_to_usd_price: number
  share_balance: number
  usd_balance: number
  share_diff: number
  underlying_diff: number
  usd_diff: number
}

interface BlockTimestampData {
  height: number
  timestamp: number
}

interface FeeEvent {
  beefyFee: number | bigint
  timestamp: Date
}

interface VaultInfo {
  beefyChain: string
  txHistory: BeefyPortfolioData[]
  vaultTvlHistory: BeefyVaultTvlData[]
  feeEvents: FeeEvent[]
}

type VaultsInfo = Record<string, VaultInfo>

type BeefyVaultTvlData = [string, number]

const NETWORK_ID_TO_DEFI_LLAMA_CHAIN: Partial<{
  [networkId in NetworkId]: string // eslint-disable-line @typescript-eslint/no-unused-vars
}> = {
  [NetworkId['ethereum-mainnet']]: 'Ethereum',
  [NetworkId['arbitrum-one']]: 'Arbitrum',
  [NetworkId['op-mainnet']]: 'Optimism',
  [NetworkId['celo-mainnet']]: 'Celo',
  [NetworkId['polygon-pos-mainnet']]: 'Polygon',
  [NetworkId['base-mainnet']]: 'base',
}

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

const BEEFY_CHAIN_TO_NETWORK_ID: Record<string, NetworkId> = {
  ethereum: NetworkId['ethereum-mainnet'],
  arbitrum: NetworkId['arbitrum-one'],
  optimism: NetworkId['op-mainnet'],
  polygon: NetworkId['polygon-pos-mainnet'],
  base: NetworkId['base-mainnet'],
}

const BEEFY_API_URL = 'https://databarn.beefy.com/api/v1/beefy'
const DEFI_LLAMA_API_URL = 'https://coins.llama.fi'

/**
 * Gets a public Viem client for a given Beefy chain specifier
 */
function getViemPublicClient(beefyChain: string) {
  const client =
    NETWORK_ID_TO_VIEM_CLIENT[BEEFY_CHAIN_TO_NETWORK_ID[beefyChain]]
  if (!client) {
    throw new Error(`No viem client found for beefy chain: ${beefyChain}`)
  }
  return client
}

/**
 * For a given vault, returns a contract object representing the strategy
 * contract associated with it.
 */
async function getStrategyContract(vault: string, beefyChain: string) {
  const vaultAddress = getAddress(vault.split(':').at(-1) as string)
  const client = getViemPublicClient(beefyChain)
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

// TODO: Memoize this function so it's not repeated for every user address
/**
 * Uses the DefiLlama API to fetch the block number nearest a given timestamp
 */
async function getNearestBlock(
  networkId: NetworkId,
  timestamp: Date,
): Promise<number> {
  const unixTimestamp = Math.floor(timestamp.getTime() / 1000)
  const defiLlamaChain = NETWORK_ID_TO_DEFI_LLAMA_CHAIN[networkId]

  const response = await fetchWithTimeout(
    `${DEFI_LLAMA_API_URL}/block/${defiLlamaChain}/${unixTimestamp}`,
  )
  if (!response.ok) {
    console.log(
      `${DEFI_LLAMA_API_URL}/block/${defiLlamaChain}/${unixTimestamp}`,
    )
    throw new Error(
      `Error while fetching block timestamp from DefiLlama: ${response}`,
    )
  }
  const blockTimestampData = (await response.json()) as BlockTimestampData
  return blockTimestampData.height
}

// TODO: Memoize this function so it's not repeated for every user address
/**
 * For a given vault, fetches the record of all ChargedFee events emitted in a given timeframe
 */
async function getFeeEvents(
  vault: string,
  beefyChain: string,
  startTimestamp: Date,
  endTimestamp: Date,
): Promise<FeeEvent[]> {
  const client = getViemPublicClient(beefyChain)
  const strategyContract = await getStrategyContract(vault, beefyChain)
  const networkId = BEEFY_CHAIN_TO_NETWORK_ID[beefyChain]

  const startBlock = await getNearestBlock(networkId, startTimestamp)
  const endBlock = await getNearestBlock(networkId, endTimestamp)
  const blocksPer = 10000
  let currentBlock = startBlock

  const feeEvents: FeeEvent[] = []
  while (currentBlock < endBlock) {
    const toBlock = Math.min(currentBlock + blocksPer, endBlock)
    const feeLogEvents = await await strategyContract.getEvents.ChargedFees({
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
    currentBlock = toBlock
  }
  return feeEvents
}

/**
 * Given a list of transaction history on a particular Beefy vault and a timestamp,
 * returns a user's TVL in the vault at the specified time.
 */
export function getUserTvl(
  txHistory: BeefyPortfolioData[],
  timestamp: Date,
): number {
  let lastTvl = txHistory[0].usd_balance
  for (const tx of txHistory) {
    if (new Date(tx.datetime) >= timestamp) {
      return lastTvl
    }
    lastTvl = tx.usd_balance
  }
  return lastTvl
}

/**
 * Given a list of Beefy vault TVL data and a timestamp, returns the vault's TVL at
 * the specified time.
 */
export function getVaultTvl(
  tvlHistory: BeefyVaultTvlData[],
  timestamp: Date,
): number {
  let lastTvl = tvlHistory[0][1]
  for (const tvl of tvlHistory) {
    if (new Date(tvl[0]) >= timestamp) {
      return lastTvl
    }
    lastTvl = tvl[1]
  }
  return lastTvl
}

// TODO: Memoize this function so it's not repeated for every user address
/**
 * For a given vault and date range, fetches historical time-series information about the TVL of the vault.
 * The TVL data consists of 15-minute snapshots.
 */
async function fetchVaultTvlHistory(
  vault: string,
  beefyChain: string,
  startTimestamp: Date,
  endTimestamp: Date,
): Promise<BeefyVaultTvlData[]> {
  // This endpoint accepts a maximum of one-week long spans.
  // We need to break down the provided date range into week-long durations.
  const timestamps = []
  let startSectionTimestamp = startTimestamp
  while (startSectionTimestamp < endTimestamp) {
    const startPlusOneWeekTimestamp = new Date(
      startSectionTimestamp.getTime() + 7 * 24 * 60 * 60 * 1000,
    ) // one week
    const endSectionTimestamp =
      startPlusOneWeekTimestamp < endTimestamp
        ? startPlusOneWeekTimestamp
        : endTimestamp
    timestamps.push([startSectionTimestamp, endSectionTimestamp])
    startSectionTimestamp = endSectionTimestamp
  }

  const vaultAddress = getAddress(vault.split(':').at(-1) as string)
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

/**
 * Gets all relevant information for all vaults a user is part of, over a given date range.
 * In particular, fetches per-vault data concerning:
 * - The user's TVL in the vault
 * - The total TVL in the vault
 * - A record of all fees charged on the vault
 */
async function getVaults(
  address: string,
  startTimestamp: Date,
  endTimestamp: Date,
): Promise<VaultsInfo> {
  const response = await fetchWithTimeout(
    `${BEEFY_API_URL}/timeline?address=${address}`,
  )
  if (!response.ok) {
    throw new Error(
      `Error while fetching portfolio data from Beefy: ${response}`,
    )
  }
  const portfolioData = (await response.json()) as BeefyPortfolioData[]

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
    vaultsInfo[vault] = {
      beefyChain,
      txHistory,
      vaultTvlHistory: await fetchVaultTvlHistory(
        vault,
        beefyChain,
        startTimestamp,
        endTimestamp,
      ),
      feeEvents: await getFeeEvents(
        vault,
        beefyChain,
        startTimestamp,
        endTimestamp,
      ),
    }
  }
  return vaultsInfo
}

/**
 * Given historical information about a vault and a user's transactions, calculates the amount of fee
 * revenue generated by the user's interaction with the vault, denominated in the native currency
 * of the chain the vault is deployed on.
 */
async function calculateVaultRevenue(
  vault: string,
  vaultInfo: VaultInfo,
): Promise<{
  tokenId: string
  revenue: string
}> {
  let totalRevenueContribution = 0n
  for (const { beefyFee, timestamp } of vaultInfo.feeEvents) {
    const userTvl = getUserTvl(vaultInfo.txHistory, timestamp)
    const vaultTvl = getVaultTvl(vaultInfo.vaultTvlHistory, timestamp)
    const partialRevenueContribution =
      (BigInt(userTvl * 10 ** 18) * BigInt(beefyFee)) /
      BigInt(vaultTvl * 10 ** 18)
    // TODO: Convert fee contributions to USD value using native token price at the time of fee collection
    // using an historical API endpoint, e.g. https://docs.coingecko.com/reference/coins-id-history
    totalRevenueContribution += partialRevenueContribution
  }

  const strategyContract = await getStrategyContract(
    vault,
    vaultInfo.beefyChain,
  )
  const nativeTokenAddress = await strategyContract.read.native()
  const networkId = BEEFY_CHAIN_TO_NETWORK_ID[vaultInfo.beefyChain]
  const tokenId = `${networkId}:${nativeTokenAddress}`
  return {
    tokenId,
    revenue: totalRevenueContribution.toString(),
  }
}

export async function calculateRevenue(
  address: string,
  startTimestamp: Date,
  endTimestamp: Date,
): Promise<RevenueResult> {
  const vaultsInfo = await getVaults(address, startTimestamp, endTimestamp)

  const revenueResult: RevenueResult = {}
  for (const [vault, vaultInfo] of Object.entries(vaultsInfo)) {
    const vaultRevenue = await calculateVaultRevenue(vault, vaultInfo)
    const networkId = BEEFY_CHAIN_TO_NETWORK_ID[vaultInfo.beefyChain]

    if (revenueResult?.[networkId]) {
      if (vaultRevenue.tokenId in revenueResult[networkId]) {
        revenueResult[networkId] = {
          ...revenueResult[networkId],
          [vaultRevenue.tokenId]:
            revenueResult[networkId][vaultRevenue.tokenId] +
            vaultRevenue.revenue,
        }
      } else {
        revenueResult[networkId] = {
          ...revenueResult[networkId],
          [vaultRevenue.tokenId]: vaultRevenue.revenue,
        }
      }
    } else {
      revenueResult[networkId] = {
        [vaultRevenue.tokenId]: vaultRevenue.revenue,
      }
    }
  }
  return revenueResult
}
