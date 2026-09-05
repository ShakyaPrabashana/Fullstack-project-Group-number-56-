import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { KEYS, read } from '../lib/storage'

async function signUp(user) {
  render(<App />)
  await user.click(await screen.findByRole('link', { name: /register/i }))

  await user.type(screen.getByLabelText(/full name/i), 'Shakya P')
  await user.type(screen.getByLabelText(/^email$/i), 'shakya@students.nsbm.ac.lk')
  await user.type(screen.getByLabelText(/^password$/i), 'correct horse')
  await user.type(screen.getByLabelText(/repeat password/i), 'correct horse')
  await user.click(screen.getByRole('button', { name: /create account/i }))

  await screen.findByRole('link', { name: /my bookings/i })
}

describe('booking a resource end to end', () => {
  it('sends a signed-out visitor to the sign-in screen', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('explains a mismatched password instead of just failing', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('link', { name: /register/i }))

    await user.type(screen.getByLabelText(/full name/i), 'Shakya P')
    await user.type(screen.getByLabelText(/^email$/i), 'shakya@students.nsbm.ac.lk')
    await user.type(screen.getByLabelText(/^password$/i), 'correct horse')
    await user.type(screen.getByLabelText(/repeat password/i), 'different')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i)
  })

  it('books a free slot and shows it on the board as yours', async () => {
    const user = userEvent.setup()
    await signUp(user)

    // SR-14 has no seeded holds, so every window on that row is free.
    await user.click(await screen.findByRole('button', { name: /Study Room 14 at 16:00, free/i }))

    await user.type(screen.getByLabelText(/what is it for/i), 'Group 56 sprint review')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(
      await screen.findByRole('button', { name: /16:00–17:00, your booking: Group 56 sprint review/i }),
    ).toBeInTheDocument()
  })

  it('keeps an unfinished booking in localStorage so a refresh does not lose it', async () => {
    const user = userEvent.setup()
    await signUp(user)

    await user.click(await screen.findByRole('button', { name: /Study Room 14 at 16:00, free/i }))
    await user.type(screen.getByLabelText(/what is it for/i), 'Half typed')

    await waitFor(() => {
      const draft = read(KEYS.draft, null)
      expect(draft).toMatchObject({ resourceId: 'SR-14', start: '16:00', purpose: 'Half typed' })
    })
  })

  it('refuses to book over an existing hold and says who has it', async () => {
    const user = userEvent.setup()
    await signUp(user)

    // LT-1 is held 09:00–11:00 by D. Fernando in the seed data.
    await user.click(await screen.findByRole('button', { name: /Main Lecture Theatre at 08:00, free/i }))

    await user.type(screen.getByLabelText(/what is it for/i), 'Clashing attempt')
    await user.click(screen.getByRole('button', { name: /^2 hr$/i })) // 08:00–10:00 runs into the hold

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/D\. Fernando/)
    expect(screen.getByRole('button', { name: /confirm booking/i })).toBeDisabled()
  })
})
