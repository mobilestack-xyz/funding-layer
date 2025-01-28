import calculateRevenueHandlers from './calculateRevenue/protocols'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import { readFileSync, writeFileSync } from 'fs'
import yargs from 'yargs'
import { protocols, Protocol } from './types'

async function main(args: ReturnType<typeof parseArgs>) {
  const eligibleAddresses = parse(
    readFileSync(args['input-addresses'], 'utf-8').toString(),
    { skip_empty_lines: true },
  ).flat()
  const handler = calculateRevenueHandlers[args['protocol-id'] as Protocol]

  const allResults: Array<{
    address: string
    revenue: number
  }> = []

  for (let i = 0; i < eligibleAddresses.length; i++) {
    const address = eligibleAddresses[i]
    console.log(
      `Calculating revenue for ${address} (${i + 1}/${eligibleAddresses.length})`,
    )
    const revenue = await handler({
      address,
      startTimestamp: new Date(args['start-timestamp']),
      endTimestamp: new Date(args['end-timestamp']),
    })
    allResults.push({
      address,
      revenue,
    })
  }

  writeFileSync(args['output-file'], stringify(allResults), {
    encoding: 'utf-8',
  })

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
