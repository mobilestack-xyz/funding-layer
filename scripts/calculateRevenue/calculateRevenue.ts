import calculateRevenueHandlers from './protocols'
import { readFileSync, writeFileSync } from 'fs'
import yargs from 'yargs'
import { protocols, Protocol, RevenueResult } from '../types'

async function main(args: ReturnType<typeof parseArgs>) {
  const eligibleAddresses = readFileSync(args['input-addresses'], 'utf-8')
    .split('\n')
    .filter((address) => address !== '')

  const handler = calculateRevenueHandlers[args['protocol-id'] as Protocol]

  const allResults: Record<string, RevenueResult> = {}

  for (let i = 0; i < eligibleAddresses.length; i++) {
    const address = eligibleAddresses[i]
    console.log(
      `Calculating revenue for ${address} (${i + 1}/${eligibleAddresses.length})`,
    )
    const userResult = await handler(
      address,
      new Date(args['start-timestamp']),
      new Date(args['end-timestamp']),
    )
    allResults[address] = userResult
  }

  writeFileSync(args['output-file'], JSON.stringify(allResults, null, 4))
  console.log(`Wrote results to ${args['output-file']}`)
}

function parseArgs() {
  return yargs
    .option('input-addresses', {
      alias: 'i',
      description: 'input file path of user addresses, newline separated',
      type: 'string',
      demandOption: true,
    })
    .option('output-file', {
      alias: 'o',
      description: 'output file path to write JSON results',
      type: 'string',
      demandOption: true,
    })
    .option('protocol-id', {
      alias: 'p',
      description: 'ID of protocol to check against',
      choices: protocols,
      demandOption: true,
    })
    .option('start-timestamp', {
      alias: 's',
      description:
        'timestamp at which to start checking for revenue (since epoch)',
      type: 'number',
      demandOption: true,
    })
    .option('end-timestamp', {
      alias: 'e',
      description:
        'timestamp at which to stop checking for revenue (since epoch)',
      type: 'number',
      demandOption: true,
    })
    .strict()
    .parseSync()
}

if (require.main === module) {
  main(parseArgs())
    .then(() => {
      process.exit(0)
    })
    .catch((err) => {
      console.log(err)
      process.exit(1)
    })
}
