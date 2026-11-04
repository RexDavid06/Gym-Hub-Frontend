import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// Tear down auth storage between tests so sessions do not leak.
afterEach(() => {
  sessionStorage.clear()
})
