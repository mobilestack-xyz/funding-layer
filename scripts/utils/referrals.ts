import { NETWORK_ID_TO_REGISTRY_ADDRESS } from './networks'
import { NetworkId, Protocol, ReferralEvent } from '../types'
import { getRegistryContract } from './index'

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
