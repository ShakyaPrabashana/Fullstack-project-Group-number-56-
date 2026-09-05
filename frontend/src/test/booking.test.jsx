import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { KEYS, read } from '../lib/storage'
import { installFakeServer } from './fakeServer'
import { todayIso } from '../lib/time'
import { __emit } from './socketMock'

let server

beforeEach(() => {
  server = installFakeServer()
})

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

  it('loads the resource catalogue from the API', async () => {
    const user = userEvent.setup()
    await signUp(user)

    // Row headers come from GET /api/resources, not from a local constant.
    const row = await screen.findByTitle(
      'LT-1 — Main Lecture Theatre. Seats 180 · Faculty of Computing · Level 1',
    )
    expect(row).toHaveTextContent('Main Lecture Theatre')
    expect(row).toHaveTextContent('Seats 180 · Faculty of Computing · Level 1')
  })

  it('books a free slot and shows it on the board as yours', async () => {
    const user = userEvent.setup()
    await signUp(user)

    await user.click(await screen.findByRole('button', { name: /Study Room 14 at 16:00, free/i }))

    await user.type(screen.getByLabelText(/what is it for/i), 'Group 56 sprint review')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(
      await screen.findByRole('button', { name: /16:00–17:00, your booking: Group 56 sprint review/i }),
    ).toBeInTheDocument()

    // It reached the server, rather than only updating local state.
    expect(server.bookings).toHaveLength(1)
    expect(server.bookings[0]).toMatchObject({ resourceId: 'SR-14', start: '16:00' })
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

  it('refuses to book over a hold made by someone else and says who has it', async () => {
    server.seedBooking({
      resourceId: 'LT-1',
      day: todayIso(),
      start: '09:00',
      end: '11:00',
      purpose: 'Software Architecture lecture',
      userId: 'someone-else',
      userName: 'D. Fernando',
    })

    const user = userEvent.setup()
    await signUp(user)

    await user.click(await screen.findByRole('button', { name: /Main Lecture Theatre at 08:00, free/i }))
    await user.type(screen.getByLabelText(/what is it for/i), 'Clashing attempt')
    await user.click(screen.getByRole('button', { name: /^2 hr$/i })) // 08:00–10:00 runs into the hold

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/D\. Fernando/)
    expect(screen.getByRole('button', { name: /confirm booking/i })).toBeDisabled()
  })

  it('shows another user booking on the board, held by them', async () => {
    server.seedBooking({
      resourceId: 'LAB-A',
      day: todayIso(),
      start: '13:00',
      end: '15:00',
      purpose: 'Full Stack Development lab',
      userId: 'someone-else',
      userName: 'T. Wickramasinghe',
    })

    const user = userEvent.setup()
    await signUp(user)

    expect(
      await screen.findByRole('button', {
        name: /13:00–15:00, held by T\. Wickramasinghe: Full Stack Development lab/i,
      }),
    ).toBeInTheDocument()
  })

  it('picks up a booking made by another client, pushed over the socket', async () => {
    const user = userEvent.setup()
    await signUp(user)

    // Nothing on LAB-B yet.
    await screen.findByRole('button', { name: /Networking Lab at 10:00, free/i })

    // Another client books it, and the server broadcasts. The board should
    // refetch and show it without any interaction in this window.
    const theirs = server.seedBooking({
      resourceId: 'LAB-B',
      day: todayIso(),
      start: '10:00',
      end: '11:00',
      purpose: 'Network Security practical',
      userId: 'someone-else',
      userName: 'R. Jayawardena',
    })
    __emit('bookings:changed', { action: 'created', booking: theirs, actorId: 'someone-else' })

    expect(
      await screen.findByRole('button', {
        name: /10:00–11:00, held by R\. Jayawardena: Network Security practical/i,
      }),
    ).toBeInTheDocument()
  })
})
