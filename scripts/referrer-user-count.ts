import { stringify } from 'csv-stringify/sync'
import { writeFileSync } from 'fs'
import yargs from 'yargs'
import { supportedNetworkIds } from './networks'
import { protocolFilters } from './filters'
import { fetchReferralEvents, removeDuplicates } from './referrals'
import { NetworkId, Protocol, protocols } from './types'

async function getArgs() {
  const argv = await yargs
    .env('')
    .option('protocol', {
      alias: 'p',
      description: 'protocol that the referrals are for',
      demandOption: true,
      choices: protocols,
      type: 'string',
    })
    .option('output-file', {
      alias: 'o',
      description: 'output file path to write JSON results',
      type: 'string',
      demandOption: true,
    })
    // This is coerced as a string array to prevent 0x... from being interpreted as a number
    .option('referrer-ids', {
      alias: 'r',
      description: 'a comma separated list of referrers IDs',
      type: 'string',
      demandOption: false,
      coerce: (arg) => new Set(arg.split(',')),
    })
    .option('network-ids', {
      alias: 'n',
      description: 'Comma-separated list of network IDs',
      type: 'string',
      demandOption: false,
      coerce: (arg: string) => new Set(arg.split(',')),
    }).argv

  return {
    protocol: argv['protocol'] as Protocol,
    protocolFilter: protocolFilters[argv['protocol'] as Protocol],
    networkIds: (argv['network-ids'] as NetworkId) ?? supportedNetworkIds,
    referrers: argv['referrer-ids'] as string,
    output: argv['output-file'],
  }
}

async function main() {
  const args = await getArgs()
  // Conversions to allow yargs to take in a list of referrer addresses / network IDs
  const referrerArray = args.referrers ? [...args.referrers] : undefined
  const networkIdsArray = [
    ...(args.networkIds ?? supportedNetworkIds),
  ] as NetworkId[]

  const referralEvents = await fetchReferralEvents(
    networkIdsArray,
    args.protocol,
    referrerArray,
  )
  const uniqueEvents = removeDuplicates(referralEvents)
  const protocolFilteredEvents = await args.protocolFilter(uniqueEvents)

  const allResultsObj = protocolFilteredEvents.reduce(
    (acc: Record<string, number>, event) => {
      const referrer = event.referrerId
      if (acc?.[referrer]) {
        acc[referrer] += 1
      } else {
        acc[referrer] = 1
      }
      return acc
    },
    {},
  )

  // Handle cases were a cli passed referrer ID param has no results
  if (referrerArray) {
    for (const referrer of referrerArray) {
      if (!allResultsObj[referrer]) {
        allResultsObj[referrer] = 0
      }
    }
  }

  const allResultsArray = Object.entries(allResultsObj).map(
    ([referrer, referralCount]) => ({
      referrer,
      referralCount,
    }),
  )

  writeFileSync(args.output, stringify(allResultsArray), { encoding: 'utf-8' })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
