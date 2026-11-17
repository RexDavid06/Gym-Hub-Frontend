import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Tear down renders and auth storage between tests so state does not leak.
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
