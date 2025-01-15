import { TokenPriceData } from '../../../types'
import { fetchWithTimeout } from '../../../utils/fetchWithTimeout'

const GET_TOKENS_PRICE_HISTORY_API_URL =
  'https://api.mainnet.valora.xyz/getTokenPriceHistory'

// TODO: Memoize this function so it's not repeated for every user address
/**
 * Fetches historical token prices for a given tokenId within the provided date range
 */
export async function fetchTokenPrices({
  tokenId,
  startTimestamp,
  endTimestamp,
}: {
  tokenId: string
  startTimestamp: Date
  endTimestamp: Date
}): Promise<TokenPriceData[]> {
  const queryParams = new URLSearchParams({
    tokenId,
    startTimestamp: startTimestamp.getTime().toString(),
    endTimestamp: endTimestamp.getTime().toString(),
  })
  const response = await fetchWithTimeout(
    `${GET_TOKENS_PRICE_HISTORY_API_URL}?${queryParams}`,
  )
  if (!response.ok) {
    throw new Error(`Error while fetching token price history: ${response}`)
  }

  const tokenPriceData = (await response.json()) as TokenPriceData[]
  return tokenPriceData
}
