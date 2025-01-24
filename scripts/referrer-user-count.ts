import yargs from 'yargs'
import { protocolFilters, supportedNetworkIds } from './consts'
import { fetchReferralEvents, removeDuplicates } from './referrals'
import { NetworkId, Protocol, protocols } from './types'
import { writeFileSync } from 'fs'

async function getArgs() {
  const argv = await yargs
    .env('')
    .option('protocol', {
      description: 'protocol that the referrals are for',
      demandOption: true,
      choices: protocols,
    })
    // This is coerced as a string array to prevent 0x... from being interpreted as a number
    .option('referrerAddresses', {
      description: 'referrer address(es)',
      type: 'string',
      demandOption: true,
      coerce: (arg) => new Set(arg.split(',')),
    })
    .option('networkIds', {
      description: 'Comma-separated list of network IDs',
      type: 'string',
      demandOption: false,
      coerce: (arg: string) => {
        const networkIds = arg.split(',').map((id) => id.trim())
        const invalidIds = networkIds.filter(
          (id) => !Object.values(NetworkId).includes(id as NetworkId),
        )
        if (invalidIds.length > 0) {
          throw new Error(`Invalid network ID(s): ${invalidIds.join(', ')}`)
        }
        return networkIds
      },
    }).argv

  return {
    protocol: argv['protocol'] as Protocol,
    protocolFilter: protocolFilters[argv['protocol'] as Protocol],
    networkIds: (argv['networkIds'] as NetworkId) ?? supportedNetworkIds,
    referrerAddresses: argv['referrerAddresses'] as string,
  }
}

async function main() {
  const args = await getArgs()
  // Conversions to allow yargs to take in a list of referrer addresses / network IDs
  const referrerArray = [...args.referrerAddresses]
  const networkIdsArray = [...args.networkIds] as NetworkId[]

  const referralEvents = await fetchReferralEvents(
    networkIdsArray,
    args.protocol,
    referrerArray,
  )
  const uniqueEvents = removeDuplicates(referralEvents)
  const protocolFilteredEvents = await args.protocolFilter(uniqueEvents)

  referrerArray.forEach((referrer) => {
    const targetReferrerEvents = protocolFilteredEvents.filter(
      (event) => event.referrerId === referrer,
    )
    const output = `${args.protocol},${targetReferrerEvents.length}`
    writeFileSync(`${referrer}_referral_count.csv`, output, {
      encoding: 'utf-8',
    })
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
