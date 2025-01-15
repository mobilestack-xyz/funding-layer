import {
  VaultInfo,
  VaultsInfo,
  BeefyInvestorTransactionWithUsdBalance,
} from './types'
import { getStrategyContract } from '../utils/viem'
import { NetworkId } from '../../../types'
import { Address } from 'viem'
import { calculateVaultRevenue, calculateRevenue } from './index'
import { getVaults } from './getVaults'

jest.mock('./getVaults')
jest.mock('../utils/viem')

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

      const mockNativeTokenId = `${NetworkId['arbitrum-one']}:${mockNativeAddress}`

      const result = await calculateVaultRevenue(mockArbitrumVaultInfo)

      // First fee of 1000 occurs while vault has 1000, user has 100 -> 100/1000 * 1000 = 100
      // Second fee of 5000 occurs while vault has 2000, user has 400 -> 400/2000 * 5000 = 1000
      const expected = {
        tokenId: mockNativeTokenId,
        revenue: '1100',
      }
      expect(result).toEqual(expected)
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

      const mockNativeTokenIdArbitrum = `${NetworkId['arbitrum-one']}:${mockNativeAddressArbitrum}`
      const mockNativeTokenIdEthereum = `${NetworkId['ethereum-mainnet']}:${mockNativeAddressEthereum}`

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

      const result = await calculateRevenue({
        address: '0x123',
        startTimestamp: new Date(0),
        endTimestamp: new Date(100),
      })
      const expected = {
        [NetworkId['arbitrum-one']]: {
          [mockNativeTokenIdArbitrum]: '1100',
        },
        [NetworkId['ethereum-mainnet']]: {
          [mockNativeTokenIdEthereum]: '100',
        },
      }
      expect(result).toEqual(expected)
    })
  })
})
