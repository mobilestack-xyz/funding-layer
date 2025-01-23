import '@nomicfoundation/hardhat-toolbox-viem'
import '@nomicfoundation/hardhat-ethers'
import '@nomicfoundation/hardhat-chai-matchers'
import '@openzeppelin/hardhat-upgrades'
import { HardhatUserConfig } from 'hardhat/config'
import { HDAccountsUserConfig } from 'hardhat/types'
import * as dotenv from 'dotenv'

dotenv.config()

const accounts: HDAccountsUserConfig = {
  mnemonic:
    process.env.MNEMONIC ||
    'test test test test test test test test test test test junk',
}

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  defender: {
    apiKey: process.env.DEFENDER_API_KEY!,
    apiSecret: process.env.DEFENDER_API_SECRET!,
  },
  networks: {
    alfajores: {
      url: 'https://alfajores-forno.celo-testnet.org',
      accounts,
      chainId: 44787,
    },
    celo: {
      url: 'https://forno.celo.org',
      accounts,
      chainId: 42220,
    },
    mainnet: {
      url: 'https://rpc.ankr.com/eth',
      accounts,
      chainId: 1,
    },
    arbitrum: {
      url: 'https://arb1.arbitrum.io/rpc',
      accounts,
      chainId: 42161,
    },
    op: {
      url: 'https://mainnet.optimism.io',
      accounts,
      chainId: 10,
    },
    base: {
      url: 'https://rpc.ankr.com/base',
      accounts,
      chainId: 8453,
    },
    polygon: {
      url: 'https://rpc.ankr.com/polygon',
      accounts,
      chainId: 137,
    },
  },
  etherscan: {
    apiKey: {
      alfajores: process.env.CELOSCAN_API_KEY!,
      celo: process.env.CELOSCAN_API_KEY!,
      arbitrumOne: process.env.ARBISCAN_API_KEY!,
      mainnet: process.env.ETHERSCAN_API_KEY!,
      optimisticEthereum: process.env.OPSCAN_API_KEY!,
      base: process.env.BASESCAN_API_KEY!,
      polygon: process.env.POLYGONSCAN_API_KEY!,
    },
    customChains: [
      {
        network: 'alfajores',
        chainId: 44787,
        urls: {
          apiURL: 'https://api-alfajores.celoscan.io/api',
          browserURL: 'https://alfajores.celoscan.io',
        },
      },
      {
        network: 'celo',
        chainId: 42220,
        urls: {
          apiURL: 'https://api.celoscan.io/api',
          browserURL: 'https://celoscan.io/',
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
}

export default config
