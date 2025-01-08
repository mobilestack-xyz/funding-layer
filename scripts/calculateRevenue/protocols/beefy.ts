import { RevenueResult, NetworkId } from '../../types'
import { fetchWithTimeout } from '../../utils/fetchWithTimeout'
import beefyVaultV7Abi from '../../abis/BeefyVaultV7'
import stratFeeManagerAbi from '../../abis/StratFeeManagerInitializable'
import { createPublicClient, http, getContract, getAddress, PublicClient, GetContractReturnType } from 'viem'
import {
  mainnet,
  arbitrum,
  optimism,
  polygon,
  base,
  celo
} from 'viem/chains'


export const NETWORK_ID_TO_CHAIN_ID: {
  [networkId in NetworkId]: number
} = {
  [NetworkId['ethereum-mainnet']]: 1,
  [NetworkId['arbitrum-one']]: 42161,
  [NetworkId['op-mainnet']]: 10,
  [NetworkId['celo-mainnet']]: 42220,
  [NetworkId['polygon-pos-mainnet']]: 137,
  [NetworkId['base-mainnet']]: 8453,
  [NetworkId['ethereum-sepolia']]: 11155111,
  [NetworkId['arbitrum-sepolia']]: 421614,
  [NetworkId['op-sepolia']]: 11155420,
  [NetworkId['celo-alfajores']]: 44787,
  [NetworkId['polygon-pos-amoy']]: 80002,
  [NetworkId['base-sepolia']]: 84532,
}

export const NETWORK_ID_TO_VIEM_CLIENT = {
  [NetworkId['ethereum-mainnet']]: createPublicClient({
    chain: mainnet,
    transport: http()
  }),
  [NetworkId['arbitrum-one']]: createPublicClient({
    chain: arbitrum,
    transport: http()
  }),
  [NetworkId['op-mainnet']]: createPublicClient({
    chain: optimism,
    transport: http()
  }),
  [NetworkId['celo-mainnet']]: createPublicClient({
    chain: celo,
    transport: http()
  }),
  [NetworkId['polygon-pos-mainnet']]: createPublicClient({
    chain: polygon,
    transport: http()
  }),
  [NetworkId['base-mainnet']]: createPublicClient({
    chain: base,
    transport: http()
  })
} as unknown as Partial<Record<NetworkId, PublicClient>>

export const BEEFY_CHAIN_TO_NETWORK_ID: Record<string, NetworkId> = {
  ethereum: NetworkId['ethereum-mainnet'],
  arbitrum: NetworkId['arbitrum-one'],
  optimism: NetworkId['op-mainnet'],
  polygon: NetworkId['polygon-pos-mainnet'],
  base: NetworkId['base-mainnet'],
}

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

type BeefyVaultTvlData = [string, number]

const BEEFY_API_URL = 'https://databarn.beefy.com/api/v1/beefy'

// Maps vaults to
export const vaultTvlMap = {}

function getViemPublicClient(beefyChain: string) {
  const client = NETWORK_ID_TO_VIEM_CLIENT[BEEFY_CHAIN_TO_NETWORK_ID[beefyChain]]
  if (!client) {
    throw new Error(`No viem client found for beefy chain: ${beefyChain}`)
  }
  return client
}

async function getStrategyContract(vault: string, beefyChain: string) {
  const vaultAddress = getAddress(vault.split(':').at(-1) as string)
  const client = getViemPublicClient(beefyChain)
  const vaultContract = getContract({
    address: vaultAddress,
    abi: beefyVaultV7Abi,
    client
  })
  const strategyAddress = await vaultContract.read.strategy()
  return getContract({
    address: strategyAddress,
    abi: stratFeeManagerAbi,
    client
  })
}

async function getStratInitBlock(strategyContract: GetContractReturnType<typeof stratFeeManagerAbi, PublicClient>, beefyChain: string): Promise<number> {
  const client = await getViemPublicClient(beefyChain)
  const currentBlock = await client.getBlockNumber()
  const blocksPer = 10000n
  let endBlock = currentBlock
  while (true) {
    console.log(endBlock)
    const fromBlock = endBlock - blocksPer
    const initEvents = await await strategyContract.getEvents.Initialized({
      fromBlock,
      toBlock: endBlock
    })
    endBlock = fromBlock
    if (initEvents.length) {
      console.log(initEvents)
      return 1
    }
  }
}
async function indexEvents(vault: string, beefyChain: string, _startTimestamp: Date, _endTimestamp: Date) {
  const strategyContract = await getStrategyContract(vault, beefyChain)
  await getStratInitBlock(strategyContract, beefyChain)
}

/**
 * Gets historical TVL of a vault in 15 minute increments
 */
async function getVaultTvlHistory(vault: string, beefyChain: string, startTimestamp: Date, endTimestamp: Date): Promise<BeefyVaultTvlData[]> {
  await indexEvents(vault, beefyChain, startTimestamp, endTimestamp)
  return []
}

async function getVaults(address: string, startTimestamp: Date, endTimestamp: Date): Promise<undefined> {
  const response = await fetchWithTimeout(`${BEEFY_API_URL}/timeline?address=${address}`)
  if (!response.ok) {
    throw new Error(`Error while fetching portfolio data from Beefy: ${response}`)
  }
  const portfolioData = await response.json() as BeefyPortfolioData[]
  const filteredData = portfolioData.filter(data => new Date(data.datetime) <= endTimestamp && new Date(data.datetime) >= startTimestamp)
  const allVaults = filteredData.reduce((vaults, data) => vaults.add(data.product_key), new Set<string>())

  const vaultInfo: Record<string, {
    txHistory: BeefyPortfolioData[],
    vaultTvlHistory: BeefyVaultTvlData[]
  }> = {}

  for (const vault of allVaults) {
    const txHistory = filteredData.filter(data => data.product_key === vault)
    vaultInfo[vault] = {
      txHistory,
      vaultTvlHistory: await getVaultTvlHistory(vault, txHistory[0].chain, startTimestamp, endTimestamp)
    }
  }
}

export async function calculateRevenue(address: string, startTimestamp: Date, endTimestamp: Date): Promise<RevenueResult> {
  // Get a list of all vaults the user currently has a balance in.
  await getVaults(address, startTimestamp, endTimestamp)
  return {
    revenue: {}
  }
}
