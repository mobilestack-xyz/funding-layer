import { RevenueResult } from '../../types'
import { fetchWithTimeout } from '../../utils/fetchWithTimeout'

export type BeefyVaultTvlData = [string, number]

const BEEFY_API_URL = 'https://databarn.beefy.com/api/v1/beefy'
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000

// TODO: Memoize this function so it's not repeated for every user address
/**
 * For a given vault and date range, fetches historical time-series information about the TVL of the vault.
 * The TVL data consists of 15-minute snapshots.
 */
export async function fetchVaultTvlHistory({
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

export async function calculateRevenue(_params: {
  address: string
  startTimestamp: Date
  endTimestamp: Date
}): Promise<RevenueResult> {
  return {}
}
