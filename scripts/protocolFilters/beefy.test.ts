import { filter, BeefyInvestorTransaction } from './beefy'
import { ReferralEvent } from '../types'
import nock from 'nock'

describe('Beefy filter function', () => {
  it('should return true if all transactions are after the referral timestamp and there is at least one transaction', async () => {
    const mockTransactions = [
      { datetime: '2023-10-01T00:00:00Z' },
      { datetime: '2023-10-02T00:00:00Z' },
    ] as BeefyInvestorTransaction[]
    const address = '0x123'
    nock(`https://databarn.beefy.com`)
      .get(`/api/v1/beefy/timeline?address=${address}`)
      .reply(200, mockTransactions)

    const event: ReferralEvent = {
      userAddress: address,
      timestamp: new Date('2023-09-30T00:00:00Z').getTime(),
      protocol: 'Beefy',
      referrerId: 'referrer1',
    }

    const result = await filter(event)
    expect(result).toEqual(true)
  })

  it('should return false if there are no transactions', async () => {
    const mockTransactions = [] as BeefyInvestorTransaction[]
    const address = '0x123'
    nock(`https://databarn.beefy.com`)
      .get(`/api/v1/beefy/timeline?address=${address}`)
      .reply(200, mockTransactions)

    const event: ReferralEvent = {
      userAddress: address,
      timestamp: new Date('2023-09-30T00:00:00Z').getTime(),
      protocol: 'Beefy',
      referrerId: 'referrer1',
    }

    const result = await filter(event)
    expect(result).toEqual(false)
  })

  it('should return false if any transaction is before the referral timestamp', async () => {
    const mockTransactions = [
      { datetime: '2023-09-29T00:00:00Z' },
      { datetime: '2023-10-02T00:00:00Z' },
    ]
    const address = '0x123'

    nock(`https://databarn.beefy.com`)
      .get(`/api/v1/beefy/timeline?address=${address}`)
      .reply(200, mockTransactions)

    const event: ReferralEvent = {
      userAddress: address,
      timestamp: new Date('2023-09-30T00:00:00Z').getTime(),
      protocol: 'Beefy',
      referrerId: 'referrer1',
    }

    const result = await filter(event)
    expect(result).toEqual(false)
  })
})
