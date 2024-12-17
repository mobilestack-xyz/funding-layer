import yargs from 'yargs'
import { filterEvents as beefy } from './protocol-filters/beefy'
import { readFileSync, writeFileSync } from 'fs'
import { ReferralEvent } from './types'

enum Protocol {
  beefy = 'beefy',
}
const protocols = Object.keys(Protocol)

type FilterFunction = (events: ReferralEvent[]) => Promise<ReferralEvent[]>

const protocolFilters: Record<Protocol, FilterFunction> = {
  [Protocol.beefy]: beefy,
}
async function getArgs() {
  const argv = await yargs
    .env('')
    .option('protocol', {
      description: 'protocol that the referrals are for',
      demandOption: true,
      choices: protocols,
    })
    .option('input', {
      alias: 'i',
      description: 'input file',
      type: 'string',
      demandOption: true,
    })
    .option('output', {
      alias: 'o',
      description: 'output file',
      type: 'string',
      default: 'rewards_processed.csv',
    }).argv

  return {
    protocol: argv['protocol'] as Protocol,
    protocolFilter: protocolFilters[argv['protocol'] as Protocol],
    input: argv['input'],
    output: argv['output'],
  }
}

async function main() {
  const args = await getArgs()

  const referralEvents: ReferralEvent[] = readFileSync(args.input, 'utf8')
    .split('\n')
    .map((line) => {
      const [userAddress, timestamp] = line.split(',')
      return {
        userAddress,
        timestamp: parseInt(timestamp),
      }
    })
  const filteredEvents = await args.protocolFilter(referralEvents)
  const output = filteredEvents
    .map((event) => `${event.userAddress},${event.timestamp}`)
    .join('\n')
  writeFileSync(args.output, output)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
