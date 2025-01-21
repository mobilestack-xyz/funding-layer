import {
  fetchVaultTvlHistory,
  getNearestBlock,
  fetchFeeEvents,
  BeefyVaultTvlData,
  BlockTimestampData,
} from './beefy'
import { getStrategyContract } from './utils/viem'
import { getViemPublicClient } from '../../utils'
import { NetworkId } from '../../types'
import nock from 'nock'

jest.mock('./utils/viem')
jest.mock('../../utils')
describe('Beefy revenue calculation', () => {
  describe('fetchVaultTvlHistory', () => {
    it('should return correct results for a <1 week span', async () => {
      const mockVaultTvlData = [
        ['foo', 1],
        ['bar', 2],
      ] as BeefyVaultTvlData[]
      nock(`https://databarn.beefy.com`)
        .get(`/api/v1/beefy/product/celo/0x123/tvl`)
        .query({
          from_date_utc: '2025-01-10T16:14:52.000Z',
          to_date_utc: '2025-01-13T16:14:52.000Z',
        })
        .reply(200, mockVaultTvlData)

      const vaultAddress = '0x123'
      const beefyChain = 'celo'
      const startTimestamp = new Date('2025-01-10T16:14:52+00:00')
      const endTimestamp = new Date('2025-01-13T16:14:52+00:00')

      const result = await fetchVaultTvlHistory({
        vaultAddress,
        beefyChain,
        startTimestamp,
        endTimestamp,
      })
      expect(result).toEqual(mockVaultTvlData)
    })
    it('should return correct results for an exactly 1 week span', async () => {
      const mockVaultTvlData = [
        ['foo', 1],
        ['bar', 2],
      ] as BeefyVaultTvlData[]
      nock(`https://databarn.beefy.com`)
        .get(`/api/v1/beefy/product/celo/0x123/tvl`)
        .query({
          from_date_utc: '2025-01-10T16:14:52.000Z',
          to_date_utc: '2025-01-17T16:14:52.000Z',
        })
        .reply(200, mockVaultTvlData)

      const vaultAddress = '0x123'
      const beefyChain = 'celo'
      const startTimestamp = new Date('2025-01-10T16:14:52+00:00')
      const endTimestamp = new Date('2025-01-17T16:14:52+00:00')

      const result = await fetchVaultTvlHistory({
        vaultAddress,
        beefyChain,
        startTimestamp,
        endTimestamp,
      })
      expect(result).toEqual(mockVaultTvlData)
    })
    it('should return correct results for a >1 week span', async () => {
      const mockVaultTvlWeekOneData = [
        ['foo', 1],
        ['bar', 2],
      ] as BeefyVaultTvlData[]
      const mockVaultTvlWeekTwoData = [
        ['baz', 3],
        ['bat', 4],
      ] as BeefyVaultTvlData[]

      const mockVaultTvlData = [
        ['foo', 1],
        ['bar', 2],
        ['baz', 3],
        ['bat', 4],
      ] as BeefyVaultTvlData[]

      nock(`https://databarn.beefy.com`)
        .get(`/api/v1/beefy/product/celo/0x123/tvl`)
        .query({
          from_date_utc: '2025-01-10T16:14:52.000Z',
          to_date_utc: '2025-01-17T16:14:52.000Z',
        })
        .reply(200, mockVaultTvlWeekOneData)
      nock(`https://databarn.beefy.com`)
        .get(`/api/v1/beefy/product/celo/0x123/tvl`)
        .query({
          from_date_utc: '2025-01-17T16:14:52.000Z',
          to_date_utc: '2025-01-20T16:14:52.000Z',
        })
        .reply(200, mockVaultTvlWeekTwoData)

      const vaultAddress = '0x123'
      const beefyChain = 'celo'
      const startTimestamp = new Date('2025-01-10T16:14:52+00:00')
      const endTimestamp = new Date('2025-01-20T16:14:52+00:00')

      const result = await fetchVaultTvlHistory({
        vaultAddress,
        beefyChain,
        startTimestamp,
        endTimestamp,
      })
      expect(result).toEqual(mockVaultTvlData)
    })
  })
  describe('getNearestBlock', () => {
    it('should correctly fetch the nearest block to a given timestamp', async () => {
      const mockBlockTimestamp: BlockTimestampData = {
        timestamp: 1234,
        height: 345,
      }
      nock(`https://coins.llama.fi`)
        .get(`/block/arbitrum/1736525692`)
        .reply(200, mockBlockTimestamp)

      const networkId = NetworkId['arbitrum-one']
      const timestamp = new Date(1736525692000)
      const result = await getNearestBlock(networkId, timestamp)

      expect(result).toEqual(345)
    })
  })
  describe('fetchFeeEvents', () => {
    it('should fetch all fee events over multiple requests', async () => {
      const mockGetFeeEvent = jest
        .fn()
        .mockImplementation(({ fromBlock }: { fromBlock: bigint }) => {
          console.log(fromBlock)
          return [
            {
              blockNumber: fromBlock,
              args: {
                beefyFees: 100n,
              },
            },
          ]
        })
      const mockGetBlock = jest
        .fn()
        .mockImplementation(({ blockNumber }: { blockNumber: bigint }) => {
          return {
            timestamp: blockNumber * 100n,
          }
        })

      jest.mocked(getViemPublicClient).mockReturnValue({
        getBlock: mockGetBlock,
      } as unknown as ReturnType<typeof getViemPublicClient>)
      jest.mocked(getStrategyContract).mockReturnValue({
        getEvents: {
          ChargedFees: mockGetFeeEvent,
        },
      } as unknown as ReturnType<typeof getStrategyContract>)

      const mockStartBlockTimestamp: BlockTimestampData = {
        timestamp: 0,
        height: 0,
      }
      const mockEndBlockTimestamp: BlockTimestampData = {
        timestamp: 1000,
        height: 15000,
      }

      nock(`https://coins.llama.fi`)
        .get(`/block/arbitrum/0`)
        .reply(200, mockStartBlockTimestamp)
      nock(`https://coins.llama.fi`)
        .get(`/block/arbitrum/1`)
        .reply(200, mockEndBlockTimestamp)

      const vaultAddress = '0x123'
      const networkId = NetworkId['arbitrum-one']
      const startTimestamp = new Date(0)
      const endTimestamp = new Date(1000)
      const result = await fetchFeeEvents(
        vaultAddress,
        networkId,
        startTimestamp,
        endTimestamp,
      )

      const expected = [
        { beefyFee: 100n, timestamp: new Date('1970-01-01T00:00:00.000Z') },
        { beefyFee: 100n, timestamp: new Date('1970-01-12T13:48:20.000Z') },
      ]
      expect(result).toEqual(expected)
      expect(mockGetFeeEvent).toHaveBeenCalledTimes(2)
      expect(mockGetFeeEvent).toHaveBeenCalledWith({
        fromBlock: 0n,
        toBlock: 10000n,
      })
      expect(mockGetFeeEvent).toHaveBeenCalledWith({
        fromBlock: 10001n,
        toBlock: 15000n,
      })
    })
  })
})
