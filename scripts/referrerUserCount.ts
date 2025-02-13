import { stringify } from 'csv-stringify/sync'
import { writeFileSync } from 'fs'
import yargs from 'yargs'
import { protocolFilters } from './protocolFilters'
import { NetworkId, Protocol, protocols } from './types'
import { supportedNetworkIds } from './utils/networks'
import { fetchReferralEvents, removeDuplicates } from './utils/referrals'

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
    .option('referrer-ids', {
      alias: 'r',
      description: 'a comma separated list of referrers IDs',
      type: 'array',
      demandOption: false,
    })
    .option('network-ids', {
      alias: 'n',
      description: 'Comma-separated list of network IDs',
      type: 'array',
      demandOption: false,
      default: supportedNetworkIds,
    }).argv

  return {
    protocol: argv['protocol'] as Protocol,
    protocolFilter: protocolFilters[argv['protocol'] as Protocol],
    networkIds: argv['network-ids'] as NetworkId[],
    referrers: argv['referrer-ids'] as string[],
    output: argv['output-file'],
  }
}

async function main() {
  const args = await getArgs()
  // Conversions to allow yargs to take in a list of referrer addresses / network IDs
  const referrerArray =
    args.referrers && !!args.referrers.length ? args.referrers : undefined

  const referralEvents = await fetchReferralEvents(
    args.networkIds,
    args.protocol,
    referrerArray,
  )
  const uniqueEvents = removeDuplicates(referralEvents)
  const protocolFilteredEvents = await args.protocolFilter(uniqueEvents)

  // Initialize allResultsObj with referrer IDs from referrerArray
  const allResultsObj: Record<string, number> = {}
  if (referrerArray) {
    for (const referrer of referrerArray) {
      allResultsObj[referrer] = 0
    }
  }

  for (const event of protocolFilteredEvents) {
    const referrer = event.referrerId
    if (referrer in allResultsObj) {
      allResultsObj[referrer] += 1
    } else {
      allResultsObj[referrer] = 1
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
