import { stringify } from 'csv-stringify/sync'
import { writeFileSync } from 'fs'
import yargs from 'yargs'
import calculateRevenueHandlers from './calculateRevenue/protocols'
import { protocolFilters } from './protocolFilters'
import { NetworkId, Protocol, protocols, ReferralEvent } from './types'
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
      type: 'array',
      demandOption: false,
    })
    .option('network-ids', {
      alias: 'n',
      description: 'comma-separated list of network IDs',
      type: 'array',
      demandOption: false,
      default: supportedNetworkIds,
    }).argv

  return {
    protocolId: argv['protocol'] as Protocol,
    protocolFilter: protocolFilters[argv['protocol'] as Protocol],
    startTimestamp: argv['start-timestamp'],
    endTimestamp: argv['end-timestamp'],
    networkIds: argv['network-ids'] as NetworkId[],
    referrers: argv['referrer-ids'] as string[],
    outputFile: argv['output-file'],
  }
}

async function main() {
  const args = await getArgs()
  const startTimestamp = new Date(args.startTimestamp)
  const endTimestamp = new Date(args.endTimestamp)
  const referrerArray =
    args.referrers && !!args.referrers.length ? args.referrers : undefined

  const referralEvents = await fetchReferralEvents(
    args.networkIds,
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

  // Initialize referrerMap with all potential referrer IDs from referrerArray
  if (referrerArray) {
    for (const referrer of referrerArray) {
      referrerMap.set(referrer, {
        totalRevenue: 0,
        referralCount: 0,
        averageRevenue: 0,
      })
    }
  }

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

  const allResultsArray: [string, number, number, number][] = []

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
      referrerInfo.averageRevenue ?? 0,
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
