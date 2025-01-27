import yargs from 'yargs'
import { protocolFilters } from './filters'
import { supportedNetworkIds } from './networks'
import { NetworkId, Protocol, protocols, ReferralEvent } from './types'
import { writeFileSync } from 'fs'
import { fetchReferralEvents, removeDuplicates } from './referrals'
import calculateRevenueHandlers from './calculateRevenue/protocols'
import { stringify } from 'csv-stringify/sync'

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
      description: 'output file path to write results',
      type: 'string',
      demandOption: true,
    })
    .option('start-timestamp', {
      alias: 's',
      description:
        'timestamp at which to start checking for revenue calculation (since epoch)',
      type: 'number',
      demandOption: false,
      default: 0,
    })
    .option('end-timestamp', {
      alias: 'e',
      description:
        'timestamp at which to stop checking for revenue calculation (since epoch)',
      type: 'number',
      demandOption: false,
      default: Date.now(),
    })
    .option('referrer-ids', {
      alias: 'r',
      description: 'a comma separated list of referrers IDs',
      type: 'string',
      demandOption: false,
      coerce: (arg) => new Set(arg.split(',')),
    })
    .option('network-ids', {
      alias: 'n',
      description: 'comma-separated list of network IDs',
      type: 'string',
      demandOption: false,
      coerce: (arg: string) => new Set(arg.split(',')),
    }).argv

  return {
    protocolId: argv['protocol'] as Protocol,
    protocolFilter: protocolFilters[argv['protocol'] as Protocol],
    startTimestamp: argv['start-timestamp'],
    endTimestamp: argv['end-timestamp'],
    networkIds: (argv['network-ids'] as NetworkId) ?? supportedNetworkIds,
    referrers: argv['referrer-ids'] as string,
    outputFile: argv['output-file'],
  }
}

async function main() {
  const args = await getArgs()
  const startTimestamp = new Date(args.startTimestamp)
  const endTimestamp = new Date(args.endTimestamp)
  const networkIdsArray = [
    ...(args.networkIds ?? supportedNetworkIds),
  ] as NetworkId[]
  const referrerArray = args.referrers ? [...args.referrers] : undefined

  const referralEvents = await fetchReferralEvents(
    networkIdsArray,
    args.protocolId,
    referrerArray,
  )

  const uniqueEvents = removeDuplicates(referralEvents)
  const protocolFilteredEvents: ReferralEvent[] =
    await args.protocolFilter(uniqueEvents)
  const revenueCalcHandler = calculateRevenueHandlers[args.protocolId]

  interface ReferralInfo {
    totalRevenue: number
    referralCount: number
    averageRevenue?: number
  }

  const referrerMap = new Map<string, ReferralInfo>()

  for (const event of protocolFilteredEvents) {
    const revenue = await revenueCalcHandler({
      address: event.userAddress,
      startTimestamp,
      endTimestamp,
    })

    const referrerInfo = referrerMap.get(event.referrerId)
    if (referrerInfo) {
      referrerInfo.totalRevenue += revenue
      referrerInfo.referralCount++
    } else {
      referrerMap.set(event.referrerId, {
        totalRevenue: revenue,
        referralCount: 1,
      })
    }
  }

  // Calculate average revenue done here to avoid calculating at each iteration
  for (const [_, referrerInfo] of referrerMap) {
    referrerInfo.averageRevenue =
      referrerInfo.totalRevenue / referrerInfo.referralCount || 0
  }

  const allResultsArray: [string, number, number, number | undefined][] = []

  // Handle cases were a cli passed referrer ID param that has no results
  if (referrerArray) {
    for (const referrer of referrerArray) {
      if (!referrerMap.get(referrer)) {
        referrerMap.set(referrer, {
          totalRevenue: 0,
          referralCount: 0,
          averageRevenue: 0,
        })
      }
    }
  }

  const headers: string[] = [
    'Referrer ID',
    'Referral Count',
    'Total Revenue',
    'Average Revenue',
  ]
  for (const [referrerId, referrerInfo] of referrerMap) {
    allResultsArray.push([
      referrerId,
      referrerInfo.referralCount,
      referrerInfo.totalRevenue,
      referrerInfo.averageRevenue,
    ])
  }

  writeFileSync(
    args.outputFile,
    stringify(allResultsArray, { header: true, columns: headers }),
    { encoding: 'utf-8' },
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
