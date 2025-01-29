import { FilterFunction, Protocol } from '../types'
import { filterEvents as filterBeefyEvents } from './beefy'

export const protocolFilters: Record<Protocol, FilterFunction> = {
  Beefy: filterBeefyEvents,
}
