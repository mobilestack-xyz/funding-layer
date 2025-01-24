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
    .option('output-file', {
      alias: 'o',
      description: 'output file path to write JSON results',
      type: 'string',
      demandOption: true,
    })
    // This is coerced as a string array to prevent 0x... from being interpreted as a number
    .option('referrer-addresses', {
      description: 'referrer address(es)',
      type: 'string',
      demandOption: false,
      coerce: (arg) => new Set(arg.split(',')),
    })
    .option('network-ids', {
      description: 'Comma-separated list of network IDs',
      type: 'string',
      demandOption: false,
      coerce: (arg: string) => new Set(arg.split(',')),
    }).argv

  return {
    protocol: argv['protocol'] as Protocol,
    protocolFilter: protocolFilters[argv['protocol'] as Protocol],
    networkIds: (argv['networkIds'] as NetworkId) ?? supportedNetworkIds,
    referrerAddresses: argv['referrerAddresses'] as string,
    output: argv['output-file'],
  }
}

function writeResults(
  outputPath: string,
  results: Array<{ referrer: string; referralCount: number }>,
) {
  const output = results
    .map((result) => `${result.referrer},${result.referralCount}`)
    .join('\n')
  writeFileSync(outputPath, output, { encoding: 'utf-8' })
}

async function main() {
  const args = await getArgs()
  // Conversions to allow yargs to take in a list of referrer addresses / network IDs
  const referrerArray = args.referrerAddresses
    ? [...args.referrerAddresses]
    : undefined
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

  const allResults: Array<{
    referrer: string
    referralCount: number
  }> = []

  // If referrer addresses are provided output all the addresses and their count
  // Else output all referrer addresses and their count
  if (referrerArray) {
    referrerArray.forEach((referrer) => {
      const targetReferrerEvents = protocolFilteredEvents.filter(
        (event) => event.referrerId === referrer,
      )
      allResults.push({
        referrer,
        referralCount: targetReferrerEvents.length,
      })
    })
  } else {
    protocolFilteredEvents.forEach((event) => {
      allResults.push({
        referrer: event.referrerId,
        referralCount: 1,
      })
    })
  }

  writeResults(args.output, allResults)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
