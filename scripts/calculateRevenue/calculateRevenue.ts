import calculateRevenueHandlers from './protocols'
import { readFileSync } from 'fs'
import yargs from 'yargs'
import { protocols, Protocol } from '../types'

async function main(args: ReturnType<typeof parseArgs>) {
  const eligibleAddresses = readFileSync(args['input-addresses'], 'utf-8')
    .split('\n').filter(address => address !== '')

  const handler = calculateRevenueHandlers[args['protocol-id'] as Protocol]
  for (const address of eligibleAddresses) {
    await handler(address, new Date(args['start-timestamp']), new Date(args['end-timestamp']))
  }
}

function parseArgs() {
  return yargs
    .option('input-addresses', {
      alias: 'i',
      description: 'input file path of user addresses, newline separated',
      type: 'string',
      demandOption: true
    })
    .option('protocol-id', {
      alias: 'p',
      description: 'ID of protocol to check against',
      choices: protocols,
      demandOption: true
    })
    .option('start-timestamp', {
      alias: 's',
      description: 'timestamp at which to start checking for revenue (since epoch)',
      type: 'number',
      demandOption: true
    })
    .option('end-timestamp', {
      alias: 'e',
      description: 'timestamp at which to stop checking for revenue (since epoch)',
      type: 'number',
      demandOption: true
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
