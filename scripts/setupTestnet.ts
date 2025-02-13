/* eslint no-console: 0 */
import '@nomicfoundation/hardhat-viem'
import hre from 'hardhat'
import { Address } from 'viem'
import yargs from 'yargs'

interface ReferrerConfig {
  protocolIds: string[]
  rewardRates: bigint[]
}

const REFERRERS: Record<string, ReferrerConfig> = {
  leefy: {
    protocolIds: ['dompounder', 'zoot', 'bartender'],
    rewardRates: [BigInt('1000000000000000000'), BigInt('1000000000000000000')],
  },
  marianashot: {
    protocolIds: ['memenfts', 'zoot'],
    rewardRates: [BigInt('1000000000000000000'), BigInt('1000000000000000000')],
  },
}

function parseArgs() {
  return yargs
    .env('')
    .option('registry-address', {
      description: 'Registry contract owner',
      type: 'string',
      demand: true,
    })
    .option('owner-address', {
      description: 'Registry contract owner',
      type: 'string',
    })
    .help()
    .parseSync()
}

async function main(args: ReturnType<typeof parseArgs>) {
  if (hre.network.name !== 'hardhat') {
    throw new RangeError('Only supports "hardhat" network')
  }

  const contract = await hre.viem.getContractAt(
    'Registry',
    args.registryAddress as Address,
  )

  const referrerIds = Object.keys(REFERRERS)

  const walletClients = [...(await hre.viem.getWalletClients())]
  // Register the referrers.
  for (const [referrer, { protocolIds, rewardRates }] of Object.entries(
    REFERRERS,
  )) {
    const walletClient = walletClients.pop()
    if (!walletClient) {
      throw new Error(
        'No more wallet clients. Increase `count`: https://hardhat.org/hardhat-network/docs/reference#accounts.',
      )
    }
    const response = await contract.write.registerReferrer([
      referrer,
      protocolIds,
      rewardRates,
      walletClient.account.address,
    ])
    console.log(
      `Referrer ${referrer}: ${protocolIds}, ${rewardRates}, ${response}`,
    )
  }

  // Generate some referals.
  let referrerCount = 0
  let protocolCount = 0
  while (walletClients.length > 0) {
    const walletClient = walletClients.pop()!

    const contract = await hre.viem.getContractAt(
      'Registry',
      process.env.REGISTRY_ADDRESS as Address,
      { client: { wallet: walletClient } },
    )

    // This makes sure we use valid values, but can cause repetitive
    // referal behavior.
    const referrerId = referrerIds[referrerCount % referrerIds.length]
    referrerCount++
    const protocolIds = REFERRERS[referrerId].protocolIds
    const protocolId = protocolIds[protocolCount % protocolIds.length]
    protocolCount++

    const response = await contract.write.registerReferral([
      referrerId,
      protocolId,
    ])

    console.log(
      `Referal ${walletClient.account.address}: ${referrerId}, ${protocolId}, ${response}`,
    )
  }
}

main(parseArgs()).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
