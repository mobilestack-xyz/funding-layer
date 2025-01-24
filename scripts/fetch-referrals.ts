import { writeFileSync } from 'fs'
import yargs from 'yargs'
import { supportedNetworkIds } from './networks'
import { protocolFilters } from './filters'
import { fetchReferralEvents, removeDuplicates } from './referrals'
import { Protocol, protocols } from './types'

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

  const referralEvents = await fetchReferralEvents(
    supportedNetworkIds,
    args.protocol,
  )
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
