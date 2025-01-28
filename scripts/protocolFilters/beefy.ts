import fetch, { RequestInit, Response } from 'node-fetch'
import { ReferralEvent } from '../types'

export async function filterEvents(
  events: ReferralEvent[],
): Promise<ReferralEvent[]> {
  const filteredEvents = []
  for (const event of events) {
    if (await filter(event)) {
      filteredEvents.push(event)
    }
  }
  return filteredEvents
}

// The user has to have made at least one transaction on Beefy Finance
// and all transactions have to be after the referral timestamp
export async function filter(event: ReferralEvent): Promise<boolean> {
  const transactions = await fetchInvestorTimeline(event.userAddress)
  console.log('transactions', transactions.length)
  return (
    transactions.every(
      (transaction) =>
        new Date(transaction.datetime).getTime() > event.timestamp,
    ) && transactions.length > 0
  )
}

export interface BeefyInvestorTransaction {
  datetime: string
  product_key: string
  display_name: string
  chain: string
  is_eol: boolean
  is_dashboard_eol: boolean
  transaction_hash: string | null
  share_to_underlying_price: number
  underlying_to_usd_price: number | null
  share_balance: number
  underlying_balance: number
  usd_balance: number | null
  share_diff: number
  underlying_diff: number
  usd_diff: number | null
}

async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  retries: number = 5,
  delay: number = 1000,
): Promise<Response> {
  try {
    const response = await fetch(url, options)
    if (!response.ok && response.status === 429 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchWithBackoff(url, options, retries - 1, delay * 2)
    }
    return response
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchWithBackoff(url, options, retries - 1, delay * 2)
    }
    throw error
  }
}

export async function fetchInvestorTimeline(
  address: string,
): Promise<BeefyInvestorTransaction[]> {
  const url = `https://databarn.beefy.com/api/v1/beefy/timeline?address=${address}`
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const response = await fetchWithBackoff(url, options)

  if (!response.ok) {
    if (response.status === 404) {
      return []
    }
    throw new Error(`Error fetching investor timeline: ${response.statusText}`)
  }

  const data: BeefyInvestorTransaction[] = await response.json()
  return data
}
