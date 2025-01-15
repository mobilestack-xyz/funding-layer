import { fetchVaultTvlHistory, BeefyVaultTvlData } from './beefy'
import nock from 'nock'

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
})
