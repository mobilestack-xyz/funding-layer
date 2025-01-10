import fetch, { RequestInit, Response } from 'node-fetch'

const FETCH_TIMEOUT_DURATION = 15000 // 15 seconds

export const fetchWithTimeout = async (
  url: string,
  options: RequestInit | null = null,
  duration: number = FETCH_TIMEOUT_DURATION,
): Promise<Response> => {
  const controller = new AbortController()
  const id = setTimeout(() => {
    controller.abort()
  }, duration)
  const response = await fetch(url, {
    ...options,
    signal: controller.signal as NonNullable<RequestInit['signal']>,
  })
  clearTimeout(id)
  return response
}
