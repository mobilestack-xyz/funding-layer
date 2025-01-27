import { fetchVaultTvlHistory, fetchFeeEvents } from './helpers'
import {
  fetchInvestorTimeline,
  BeefyInvestorTransaction,
} from '../../../protocolFilters/beefy'
import { getVaults } from './getVaults'
import {
  BeefyVaultTvlData,
  FeeEvent,
  VaultsInfo,
  BeefyInvestorTransactionWithUsdBalance,
} from './types'
import { NetworkId } from '../../../types'

const mockInvestorTimelineData: BeefyInvestorTransaction[] = [
  {
    datetime: '2025-01-10T19:30:55.868Z',
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
    usd_balance: 10,
    share_diff: 0,
    underlying_diff: 0,
    usd_diff: 0,
  },
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
    usd_balance: 10,
    share_diff: 0,
    underlying_diff: 0,
    usd_diff: 0,
  },
  {
    datetime: '2025-01-08T19:30:55.868Z',
    product_key: 'beefy:vault:base:0x1111111111111111111111111111111111111111',
    display_name: 'synapse-syn-weth',
    chain: 'base',
    is_eol: true,
    is_dashboard_eol: true,
    transaction_hash:
      '0x63437809ee6419b892ad12a3b2b9ac7f72c151600c0c65484c9fa2113f4bfb54',
    share_to_underlying_price: 0,
    underlying_to_usd_price: 0,
    share_balance: 0,
    underlying_balance: 0,
    usd_balance: 5,
    share_diff: 0,
    underlying_diff: 0,
    usd_diff: 0,
  },
  {
    datetime: '2025-01-01T19:30:55.868Z',
    product_key: 'beefy:vault:base:0x1111111111111111111111111111111111111111',
    display_name: 'synapse-syn-weth',
    chain: 'base',
    is_eol: true,
    is_dashboard_eol: true,
    transaction_hash:
      '0x63437809ee6419b892ad12a3b2b9ac7f72c151600c0c65484c9fa2113f4bfb54',
    share_to_underlying_price: 0,
    underlying_to_usd_price: 0,
    share_balance: 0,
    underlying_balance: 0,
    usd_balance: null,
    share_diff: 0,
    underlying_diff: 0,
    usd_diff: 0,
  },
]

const mockVaultTvlHistory: BeefyVaultTvlData[] = [
  ['foo', 1],
  ['bar', 2],
]

const mockFeeEvents: FeeEvent[] = [
  {
    beefyFee: 100,
    timestamp: new Date(1000),
  },
  {
    beefyFee: 1000,
    timestamp: new Date(2000),
  },
]

jest.mock('./helpers')
jest.mock('../../../protocolFilters/beefy')

describe('getVaults', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should return all vault information, sort tx history by date, filter out txs with no usd balance', async () => {
    jest
      .mocked(fetchInvestorTimeline)
      .mockResolvedValue(mockInvestorTimelineData)
    jest.mocked(fetchVaultTvlHistory).mockResolvedValue(mockVaultTvlHistory)
    jest.mocked(fetchFeeEvents).mockResolvedValue(mockFeeEvents)

    const address = '0x123'
    const startTimestamp = new Date(100)
    const endTimestamp = new Date(200)
    const result = await getVaults(address, startTimestamp, endTimestamp)

    const expected: VaultsInfo = {
      'beefy:vault:arbitrum:0x0000000000000000000000000000000000000000': {
        networkId: NetworkId['arbitrum-one'],
        vaultAddress: '0x0000000000000000000000000000000000000000',
        txHistory: [
          mockInvestorTimelineData[1],
          mockInvestorTimelineData[0],
        ] as BeefyInvestorTransactionWithUsdBalance[],
        vaultTvlHistory: mockVaultTvlHistory,
        feeEvents: mockFeeEvents,
      },
      'beefy:vault:base:0x1111111111111111111111111111111111111111': {
        networkId: NetworkId['base-mainnet'],
        vaultAddress: '0x1111111111111111111111111111111111111111',
        txHistory: [
          mockInvestorTimelineData[2],
        ] as BeefyInvestorTransactionWithUsdBalance[],
        vaultTvlHistory: mockVaultTvlHistory,
        feeEvents: mockFeeEvents,
      },
    }

    expect(result).toEqual(expected)
  })
})
