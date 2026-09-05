# CampusBook — frontend

Room and equipment booking for campus. React + Vite, talking to the Express API in
`../backend` over REST, with live updates over Socket.io.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Jest + React Testing Library
npm run build
```

The dev server needs the API running on :8080 (see backend/README.md), which
Vite proxies to. Without it the board shows a "cannot reach the server" notice.

With Docker, from the repository root, which starts Mongo, the API and this app
together:

```bash
docker compose up --build     # http://localhost:5180
FRONTEND_PORT=4000 docker compose up   # if 5180 is taken
```

## What it does

The board shows every bookable resource as a row and the day 08:00–20:00 as columns.
Free time has no fill at all — everything you see is a mark on an otherwise empty
ledger. Someone else's hold is drawn in drafting hatch; your own booking is the only
solid colour on screen. On today's board a red rule tracks the current time.

Click any free window to open the booking panel, set a duration and a purpose, and
confirm. Register and sign in are real flows with protected routes.

## How the brief's requirements are met

| Requirement | Where |
| --- | --- |
| Reusable React components | `src/components/`, `src/pages/` |
| Authentication, protected routes | `src/state/AuthContext.jsx`, `Protected` in `src/App.jsx` |
| Client-side persistence | `src/state/useDraft.js` — the in-progress booking survives a refresh |
| Concurrent edit handling | `createBooking` in `src/api/client.js`, surfaced by `Alert` in `BookingDrawer.jsx` |
| Real-time between clients | `src/lib/live.js` |
| Client tests | `npm test` — Jest + React Testing Library, 28 tests |
| Containerised | `Dockerfile`, `nginx.conf`, root `docker-compose.yml` |

### Concurrency

Between opening a draft and confirming it, someone else may take the window. Rather
than overwriting them, `createBooking` re-checks current state at confirm time and
returns the booking that got there first, so the panel can name who holds it and what
for. The board refreshes to their version — the earlier booking always wins.

### Real-time

`src/lib/live.js` holds a Socket.io connection, authenticated with the same JWT as the
REST calls — an unauthenticated socket is refused rather than being allowed to watch
the board.

**Open the app in two browsers on different machines, sign in as two people, and book
something in one — it appears in the other immediately, with a brief pulse.**

The client only ever listens; it never emits booking events. A change goes through the
REST API, and the server broadcasts once the write has landed, so the database stays
the single source of truth. The broadcast is treated as a nudge to refetch rather than
as data, and your own actions are not pulsed back at you.

Tests drive this through `src/test/socketMock.js`, so the subscribe-and-refetch path is
covered without a running server.

## Talking to the backend

`src/api/client.js` is the only file that talks to the API. Every function maps to
one endpoint:

```
listResources  -> GET    /api/resources
listBookings   -> GET    /api/bookings?day=YYYY-MM-DD
createBooking  -> POST   /api/bookings
cancelBooking  -> DELETE /api/bookings/:id
register/login -> POST   /api/auth/register | /api/auth/login
```

Requests go to a relative `/api` path, routed in both environments: Vite proxies it
to `localhost:8080` in dev, nginx proxies it to the `backend` container in Docker.
Set `VITE_API_URL` to point elsewhere.

The JWT and the signed-in user are kept in `localStorage`, so a refresh does not
bounce you to the sign-in screen. `request()` attaches `Authorization: Bearer` to
every call and turns a failed `fetch` into a readable message rather than an
unhandled rejection.

Tests run against `src/test/fakeServer.js`, an in-memory double implementing the
same contract, so the HTTP path is exercised without needing a server or Mongo.

## Design notes

Direction is **"vacancy board"**: availability read as presence and absence, borrowed
from key boards and drafting conventions rather than from a calendar app.

- **Colour** — `--paper` ground, `--card` board, `--ink` text and the one dark band,
  `--claim` deep green for your bookings and confirm actions, `--taken` grey which is
  *always hatched and never solid*, `--alert` red for conflicts only. Free gets nothing.
- **Type** — Chivo for display, Karla for body, JetBrains Mono for asset IDs, times and
  capacities, where tabular figures are a requirement rather than a style choice.
- **Restraint** — one solid accent, one dark band, one texture. Everything else is
  hairlines and white space.

Keep CSS selectors flat and single-class; the stylesheet has no element-plus-class
selectors, which is what stops section spacing rules from cancelling each other out.

## Known limitations

- The API must be running, or the board shows a "cannot reach the server" notice and
  stays empty. There is no offline read cache yet.
- The JWT is kept in `localStorage`, which is readable by any script on the page. It
  is the pragmatic choice for coursework; a httpOnly cookie would be the stronger one.
- Nothing refreshes an expired token. After seven days the next request fails and you
  have to sign in again.
- Board cells are pointer shortcuts and are skipped by Tab. The keyboard path is the
  resource-name button on each row, which opens the same panel with day, start and
  duration as ordinary form controls.
- The booking panel is not a full focus trap. It closes on Escape and takes focus on
  open, but focus can leave it while it is open.
- Tests run on Vitest, not Jest. The API is the same and RTL is unchanged, but the
  brief names Jest — worth confirming with the facilitator before submission.
- Nothing enforces booking rules beyond clashes: no maximum length, no limit per
  person, no approval step for large rooms.
