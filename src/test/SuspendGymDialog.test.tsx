import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SuspendGymDialog } from '../components/SuspendGymDialog'

describe('SuspendGymDialog', () => {
  it('requires a reason before confirming a suspension', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <SuspendGymDialog
        open
        gymName="Alpha Fitness"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Suspend gym' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(
      screen.getByText('Enter a reason before suspending this gym.'),
    ).toBeInTheDocument()
  })

  it('confirms with the trimmed reason', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <SuspendGymDialog
        open
        gymName="Alpha Fitness"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    await user.type(screen.getByLabelText('Reason'), '  Unpaid invoice  ')
    await user.click(screen.getByRole('button', { name: 'Suspend gym' }))

    expect(onConfirm).toHaveBeenCalledWith('Unpaid invoice')
  })
})
