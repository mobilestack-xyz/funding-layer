import { FilterFunction, Protocol } from './types'
import { filterEvents as beefy } from './protocol-filters/beefy'

export const protocolFilters: Record<Protocol, FilterFunction> = {
  Beefy: beefy,
}
