import { Protocol, CalculateRevenueFn } from '../../types'
import { calculateRevenue as calculateRevenueBeefy } from './beefy/beefy'

const calculateRevenueHandlers: Record<Protocol, CalculateRevenueFn> = {
  Beefy: calculateRevenueBeefy,
}

export default calculateRevenueHandlers
