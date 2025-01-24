/* eslint no-console: 0 */
import hre from 'hardhat'
import { loadSecret } from '@valora/secrets-loader'
import '@nomicfoundation/hardhat-ethers'
import '@openzeppelin/hardhat-upgrades'
import yargs from 'yargs'

async function getConfig() {
  //
  // Load secrets from Secrets Manager and inject into process.env.
  //
  const secretNames = process.env.SECRET_NAMES?.split(',') ?? []
  for (const secretName of secretNames) {
    Object.assign(process.env, await loadSecret(secretName))
  }

  const argv = await yargs
    .env('')
    .option('use-defender', {
      description: 'Deploy using OpenZeppelin Defender',
      type: 'boolean',
      implies: ['deploy-salt'],
    })
    .option('deploy-salt', {
      description: 'Salt to use for CREATE2 deployments',
      type: 'string',
    })
    .option('owner-address', {
      description: 'Address of the address to use as owner',
      type: 'string',
      demandOption: true,
    })
    .check((argv) => {
      if (argv.useDefender && !SUPPORTED_NETWORKS.includes(hre.network.name)) {
        throw Error(
          `--use-defender only supports networks: ${SUPPORTED_NETWORKS}`,
        )
      }
      return true
    }).argv

  return {
    useDefender: argv['use-defender'],
    deploySalt: argv['deploy-salt'],
    ownerAddress: argv['owner-address'],
  }
}

const CONTRACT_NAME = 'Registry'

const SUPPORTED_NETWORKS = [
  'celo',
  'mainnet',
  'arbitrum',
  'polygon',
  'op',
  'base',
]

const ONE_DAY = 60 * 60 * 24

async function main() {
  const config = await getConfig()
  const Registry = await hre.ethers.getContractFactory(CONTRACT_NAME)

  let address: string

  const constructorArgs = [config.ownerAddress, ONE_DAY]
  if (config.useDefender) {
    console.log(`Deploying ${CONTRACT_NAME} with OpenZeppelin Defender`)
    const result = await hre.defender.deployContract(
      Registry,
      constructorArgs,
      { salt: config.deploySalt },
    )
    address = await result.getAddress()
  } else {
    console.log(`Deploying ${CONTRACT_NAME} with local signer`)
    const result = await Registry.deploy(...constructorArgs)
    address = await result.getAddress()
  }

  console.log('\nTo verify the contract, run:')
  console.log(
    `yarn hardhat verify ${address} --network ${hre.network.name} ${constructorArgs.join(' ')}`,
  )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
