import { Address } from 'viem'
import { NetworkId, Protocol, ReferralEvent } from './types'
import { getRegistryContract } from './utils'

// TODO(ACT-1490): Update this map with the correct registry addresses
const NETWORK_ID_TO_REGISTRY_ADDRESS = {
  [NetworkId['ethereum-mainnet']]: '0x0',
  [NetworkId['arbitrum-one']]: '0x0',
  [NetworkId['op-mainnet']]: '0x0',
  [NetworkId['celo-mainnet']]: '0x0',
  [NetworkId['polygon-pos-mainnet']]: '0x0',
  [NetworkId['base-mainnet']]: '0x0',
} as Partial<Record<NetworkId, Address>>

// Remove duplicate events, keeping only the earliest event for each user
export function removeDuplicates(events: ReferralEvent[]): ReferralEvent[] {
  const uniqueEventsMap: Map<string, ReferralEvent> = new Map()

  for (const event of events) {
    const existingEvent = uniqueEventsMap.get(event.userAddress)

    if (!existingEvent || event.timestamp < existingEvent.timestamp) {
      uniqueEventsMap.set(event.userAddress, event)
    }
  }

  return Array.from(uniqueEventsMap.values())
}

// Fetch all referral events on all networks for the given protocol
export async function fetchReferralEvents(
  networkIds: NetworkId[],
  protocol: Protocol,
): Promise<ReferralEvent[]> {
  const referralEvents: ReferralEvent[] = []

  await Promise.all(
    networkIds.map(async (networkId) => {
      if (!NETWORK_ID_TO_REGISTRY_ADDRESS[networkId]) {
        return
      }
      const registryContract = await getRegistryContract(
        NETWORK_ID_TO_REGISTRY_ADDRESS[networkId],
        networkId,
      )
      const referrers = (await registryContract.read.getReferrers([
        protocol,
      ])) as string[]

      await Promise.all(
        referrers.map(async (referrer) => {
          const [userAddresses, timestamps] =
            (await registryContract.read.getUsers([protocol, referrer])) as [
              string[],
              number[],
            ]
          userAddresses.forEach((userAddress, index) => {
            referralEvents.push({
              protocol,
              userAddress,
              referrerId: referrer,
              timestamp: timestamps[index],
            })
          })
        }),
      )
    }),
  )
  return referralEvents
}
