import { vi } from 'vitest'

export type RouteHandler = (request: Request) => Response | Promise<Response>

const router = new Map<string, unknown>()

export function route(pattern: string, handler: unknown) {
  router.set(pattern, handler)
}

export function restoreFetch() {
  vi.restoreAllMocks()
}

export function mockFetch(){}
