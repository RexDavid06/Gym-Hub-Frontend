/**
 * Route helpers for the platform admin surfaces. Kept separate from the page
 * components so route guards can be tested without rendering the whole app.
 */
export const platformRoutes = {
  overview: '/platform',
  gyms: '/platform/gyms',
  gymDetail: (id: number) => `/platform/gyms/${id}`,
}

export function isPlatformRoute(route: string) {
  const path = route.split('?')[0]
  return path === platformRoutes.overview || path.startsWith(`${platformRoutes.overview}/`)
}

export function platformGymId(route: string) {
  const match = /^\/platform\/gyms\/(\d+)$/.exec(route.split('?')[0])
  return match ? Number(match[1]) : null
}
