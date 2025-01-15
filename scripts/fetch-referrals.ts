import yargs from 'yargs'
import { filterEvents as beefy } from './protocol-filters/beefy'
import { writeFileSync } from 'fs'
import { NetworkId, Protocol, protocols, ReferralEvent } from './types'
import { fetchReferralEvents, removeDuplicates } from './referrals'

type FilterFunction = (events: ReferralEvent[]) => Promise<ReferralEvent[]>

const protocolFilters: Record<Protocol, FilterFunction> = {
  Beefy: beefy,
}

async function getArgs() {
  const argv = await yargs
    .env('')
    .option('protocol', {
      description: 'protocol that the referrals are for',
      demandOption: true,
      choices: protocols,
    })
    .option('output', {
      alias: 'o',
      description: 'output file',
      type: 'string',
      default: 'filtered_referrals.csv',
    }).argv

  return {
    protocol: argv['protocol'] as Protocol,
    protocolFilter: protocolFilters[argv['protocol'] as Protocol],
    output: argv['output'],
  }
}

async function main() {
  const args = await getArgs()

  const networkIds = [
    NetworkId['celo-mainnet'],
    NetworkId['ethereum-mainnet'],
    NetworkId['arbitrum-one'],
    NetworkId['op-mainnet'],
    NetworkId['polygon-pos-mainnet'],
    NetworkId['base-mainnet'],
  ]

  const referralEvents = await fetchReferralEvents(networkIds, args.protocol)
  const uniqueEvents = removeDuplicates(referralEvents)

  const filteredEvents = await args.protocolFilter(uniqueEvents)
  const output = filteredEvents
    .map(
      (event) =>
        `${args.protocol},${event.referrerId},${event.userAddress},${event.timestamp}`,
    )
    .join('\n')
  writeFileSync(args.output, output)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
