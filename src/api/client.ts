import type { paths } from './schema'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

type ApiMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'
type ApiPath = keyof paths & string
type PathsFor<M extends ApiMethod> = {
  [P in ApiPath]: paths[P] extends Record<M, unknown> ? P : never
}[ApiPath]
type Operation<P extends ApiPath, M extends ApiMethod> = paths[P] extends Record<M, infer O>
  ? O
  : never
type JsonBody<O> = O extends {
  requestBody: { content: { 'application/json': infer B } }
}
  ? B
  : never
type Query<O> = O extends { parameters: { query?: infer Q } } ? Q : never
type SuccessResponse<O> = O extends { responses: infer R }
  ? {
      [S in keyof R]: R[S] extends { content: { 'application/json': infer C } } ? C : undefined
    }[keyof R]
  : never

type ApiOptions<O> = {
  body?: JsonBody<O>
  query?: Query<O>
  skipAuthRefresh?: boolean
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

let accessToken: string | null = null
let refreshAccessToken: (() => Promise<string | null>) | null = null
let refreshInFlight: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshAccessToken = handler
}

export function buildApiPath<P extends ApiPath>(
  template: P,
  params: Record<string, string | number>,
): P {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) =>
    encodeURIComponent(String(params[key])),
  ) as P
}

function buildQuery(query: unknown) {
  if (!query || typeof query !== 'object') return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

async function readErrorMessage(response: Response) {
  try {
    const payload: unknown = await response.json()
    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>
      if (typeof record.detail === 'string') return record.detail
      for (const value of Object.values(record)) {
        if (typeof value === 'string') return value
        if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
      }
    }
  } catch {
    // Fall back to the HTTP status when the response body is not JSON.
  }
  return `Request failed (${response.status})`
}

async function requestWithToken<P extends PathsFor<M>, M extends ApiMethod>(
  path: P,
  method: M,
  options: ApiOptions<Operation<P, M>>,
) {
  const response = await fetch(`${apiBaseUrl}${path}${buildQuery(options.query)}`, {
    method: method.toUpperCase(),
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  })
  return response
}

export async function apiFetch<P extends PathsFor<M>, M extends ApiMethod = 'get'>(
  path: P,
  method: M,
  options: ApiOptions<Operation<P, M>> = {},
): Promise<SuccessResponse<Operation<P, M>>> {
  let response = await requestWithToken(path, method, options)

  if (response.status === 401 && !options.skipAuthRefresh && refreshAccessToken) {
    refreshInFlight ??= refreshAccessToken().finally(() => {
      refreshInFlight = null
    })
    const freshToken = await refreshInFlight
    if (freshToken) {
      response = await requestWithToken(path, method, { ...options, skipAuthRefresh: true })
    }
  }

  if (!response.ok) {
    let data: unknown
    try {
      data = await response.clone().json()
    } catch {
      data = undefined
    }
    throw new ApiError(await readErrorMessage(response), response.status, data)
  }

  if (response.status === 204) return undefined as SuccessResponse<Operation<P, M>>
  return (await response.json()) as SuccessResponse<Operation<P, M>>
}
