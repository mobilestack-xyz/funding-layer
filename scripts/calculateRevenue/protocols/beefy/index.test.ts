import {
  VaultInfo,
  VaultsInfo,
  BeefyInvestorTransactionWithUsdBalance,
} from './types'
import { getStrategyContract } from '../utils/viem'
import { NetworkId, TokenPriceData } from '../../../types'
import { Address } from 'viem'
import { calculateVaultRevenue, calculateRevenue } from './index'
import { getVaults } from './getVaults'
import { getErc20Contract } from '../../../utils'
import { fetchTokenPrices } from '../utils/tokenPrices'

jest.mock('./getVaults')
jest.mock('../utils/viem')
jest.mock('../../../utils')
jest.mock('../utils/tokenPrices')

const mockArbitrumVaultInfo: VaultInfo = {
  networkId: NetworkId['arbitrum-one'],
  vaultAddress: '0x0000000000000000000000000000000000000000' as Address,
  txHistory: [
    {
      datetime: '2025-01-01T19:30:55.868Z',
      product_key:
        'beefy:vault:arbitrum:0x0000000000000000000000000000000000000000',
      display_name: 'synapse-syn-weth',
      chain: 'arbitrum',
      is_eol: true,
      is_dashboard_eol: true,
      transaction_hash:
        '0x63437809ee6419b892ad12a3b2b9ac7f72c151600c0c65484c9fa2113f4bfb54',
      share_to_underlying_price: 0,
      underlying_to_usd_price: 0,
      share_balance: 0,
      underlying_balance: 0,
      usd_balance: 100,
      share_diff: 0,
      underlying_diff: 0,
      usd_diff: 0,
    },
    {
      datetime: '2025-01-02T00:30:55.868Z',
      product_key:
        'beefy:vault:arbitrum:0x0000000000000000000000000000000000000000',
      display_name: 'synapse-syn-weth',
      chain: 'arbitrum',
      is_eol: true,
      is_dashboard_eol: true,
      transaction_hash:
        '0x63437809ee6419b892ad12a3b2b9ac7f72c151600c0c65484c9fa2113f4bfb54',
      share_to_underlying_price: 0,
      underlying_to_usd_price: 0,
      share_balance: 0,
      underlying_balance: 0,
      usd_balance: 400,
      share_diff: 0,
      underlying_diff: 0,
      usd_diff: 0,
    },
  ] as BeefyInvestorTransactionWithUsdBalance[],
  vaultTvlHistory: [
    ['2025-01-01T10:30:55.868Z', 1000],
    ['2025-01-02T10:30:55.868Z', 2000],
  ],
  feeEvents: [
    {
      beefyFee: 1000,
      timestamp: new Date('2025-01-01T20:30:55.868Z'),
    },
    {
      beefyFee: 5000,
      timestamp: new Date('2025-01-02T20:30:55.868Z'),
    },
  ],
}

const mockEthereumVaultInfo: VaultInfo = {
  networkId: NetworkId['ethereum-mainnet'],
  vaultAddress: '0x0000000000000000000000000000000000000001' as Address,
  txHistory: [
    {
      datetime: '2025-01-01T19:30:55.868Z',
      product_key:
        'beefy:vault:ethereum:0x000000000000000000000000000000000000001',
      display_name: 'synapse-syn-weth',
      chain: 'arbitrum',
      is_eol: true,
      is_dashboard_eol: true,
      transaction_hash:
        '0x63437809ee6419b892ad12a3b2b9ac7f72c151600c0c65484c9fa2113f4bfb54',
      share_to_underlying_price: 0,
      underlying_to_usd_price: 0,
      share_balance: 0,
      underlying_balance: 0,
      usd_balance: 100,
      share_diff: 0,
      underlying_diff: 0,
      usd_diff: 0,
    },
    {
      datetime: '2025-01-02T00:30:55.868Z',
      product_key:
        'beefy:vault:ethereum:0x0000000000000000000000000000000000000001',
      display_name: 'synapse-syn-weth',
      chain: 'arbitrum',
      is_eol: true,
      is_dashboard_eol: true,
      transaction_hash:
        '0x63437809ee6419b892ad12a3b2b9ac7f72c151600c0c65484c9fa2113f4bfb54',
      share_to_underlying_price: 0,
      underlying_to_usd_price: 0,
      share_balance: 0,
      underlying_balance: 0,
      usd_balance: 400,
      share_diff: 0,
      underlying_diff: 0,
      usd_diff: 0,
    },
  ] as BeefyInvestorTransactionWithUsdBalance[],
  vaultTvlHistory: [
    ['2025-01-01T10:30:55.868Z', 1000],
    ['2025-01-02T10:30:55.868Z', 2000],
  ],
  feeEvents: [
    {
      beefyFee: 1000,
      timestamp: new Date('2025-01-01T20:30:55.868Z'),
    },
  ],
}

const mockTokenPricesArbitrum: TokenPriceData[] = [
  {
    priceUsd: '1000',
    priceFetchedAt: new Date('2025-01-01T20:29:55.868Z').getTime(), // Just before the first fee
  },
  {
    priceUsd: '1500',
    priceFetchedAt: new Date('2025-01-02T20:29:55.868Z').getTime(), // Just before the second fee
  },
]

const mockTokenPricesEthereum: TokenPriceData[] = [
  {
    priceUsd: '500',
    priceFetchedAt: new Date('2025-01-01T20:29:55.868Z').getTime(), // Just before the only fee
  },
]

describe('Beefy revenue calculation', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('calculateVaultRevenue', () => {
    it('should return correct calculation', async () => {
      const mockNativeAddress = '0x2222222222222222222222222222222222222222'
      jest.mocked(getStrategyContract).mockResolvedValue({
        read: {
          native: jest.fn().mockResolvedValue(mockNativeAddress),
        },
      } as unknown as ReturnType<typeof getStrategyContract>)

      jest.mocked(getErc20Contract).mockResolvedValue({
        read: {
          decimals: jest.fn().mockResolvedValue(4),
        },
      } as unknown as ReturnType<typeof getErc20Contract>)

      jest.mocked(fetchTokenPrices).mockResolvedValue(mockTokenPricesArbitrum)
      const result = await calculateVaultRevenue(mockArbitrumVaultInfo)

      // native token has 4 decimals, so 1 token is 10000 wei
      // First fee of 1000 occurs while vault has 1000, user has 100 -> 100/1000 * 1000 = 100 wei
      // - token price is 1000 -> 100 / 10000 * 1000 USD = 10 USD
      // Second fee of 5000 occurs while vault has 2000, user has 400 -> 400/2000 * 5000 = 1000 wei
      // - token price is 1500 -> 1000 / 10000 * 1500 USD = 150 USD
      expect(result).toEqual(160)
    })
  })

  describe('calculateRevenue', () => {
    it('should return results for multiple native tokens across multiple chains', async () => {
      const mockVaultsInfo: VaultsInfo = {
        'beefy:vault:arbitrum:0x0000000000000000000000000000000000000000':
          mockArbitrumVaultInfo,
        'beefy:vault:ethereum:0x000000000000000000000000000000000000001':
          mockEthereumVaultInfo,
      }
      const mockVaultAddressArbitrum =
        '0x0000000000000000000000000000000000000000'

      const mockNativeAddressArbitrum =
        '0x2222222222222222222222222222222222222222'
      const mockNativeAddressEthereum =
        '0x3333333333333333333333333333333333333333'

      const mockNativeTokenIdArbitrum = `${NetworkId['arbitrum-one']}:native`

      jest.mocked(getVaults).mockResolvedValue(mockVaultsInfo)
      jest.mocked(getStrategyContract).mockImplementation(((
        vaultAddress: Address,
        _networkId: NetworkId,
      ) => {
        return Promise.resolve({
          read: {
            native: jest.fn().mockImplementation(() => {
              if (vaultAddress === mockVaultAddressArbitrum) {
                return Promise.resolve(mockNativeAddressArbitrum)
              } else {
                return Promise.resolve(mockNativeAddressEthereum)
              }
            }),
          },
        })
      }) as unknown as typeof getStrategyContract)

      jest.mocked(getErc20Contract).mockResolvedValue({
        read: {
          decimals: jest.fn().mockResolvedValue(4),
        },
      } as unknown as ReturnType<typeof getErc20Contract>)

      jest
        .mocked(fetchTokenPrices)
        .mockImplementation(async ({ tokenId }: { tokenId: string }) => {
          if (tokenId === mockNativeTokenIdArbitrum) {
            return mockTokenPricesArbitrum
          } else {
            return mockTokenPricesEthereum
          }
        })

      const result = await calculateRevenue({
        address: '0x123',
        startTimestamp: new Date(0),
        endTimestamp: new Date(100),
      })

      // 160 USD from Arbitrum, 5 from Ethereum
      expect(result).toEqual(165)
    })
  })
})
