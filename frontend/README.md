# CampusBook — frontend

Room and equipment booking for campus. React + Vite. This is the front-end tier only;
the Express API, MongoDB, and Socket.io server land in later milestones.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 20 tests
npm run build
```

With Docker, from the repository root:

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
| Client tests | `npm test` — 20 tests across `src/lib`, `src/api`, `src/test` |
| Containerised | `Dockerfile`, `nginx.conf`, root `docker-compose.yml` |

### Concurrency

Between opening a draft and confirming it, someone else may take the window. Rather
than overwriting them, `createBooking` re-checks current state at confirm time and
returns the booking that got there first, so the panel can name who holds it and what
for. The board refreshes to their version — the earlier booking always wins.

### Real-time, before the server exists

`src/lib/live.js` wires tabs together with `BroadcastChannel`. **Open the app in two
windows, sign in as two different people, and book something in one — it appears in
the other immediately, with a brief pulse.** That is the whole demo, no backend needed.

Swapping in Socket.io means editing only that file; `connect()` and `publish()` are all
the rest of the app knows about.

## Wiring the backend (M2)

`src/api/client.js` is the only file that talks to storage, and every function is
already async and shaped like its endpoint:

```
listResources  -> GET    /api/resources
listBookings   -> GET    /api/bookings?day=YYYY-MM-DD
createBooking  -> POST   /api/bookings
cancelBooking  -> DELETE /api/bookings/:id
register/login -> POST   /api/auth/register | /api/auth/login
```

Vite proxies `/api` to `localhost:8080` in dev. For the container, uncomment the
`/api/` block in `nginx.conf` and the `backend` service in `docker-compose.yml`.

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

- No backend. Everything persists to `localStorage` and is per-browser; clearing site
  data resets it. Accounts are local, and while passwords are salted and SHA-256 hashed
  rather than stored in the clear, that is **not** security — real auth is the JWT the
  Express server will issue in M2.
- Board cells are pointer shortcuts and are skipped by Tab. The keyboard path is the
  resource-name button on each row, which opens the same panel with day, start and
  duration as ordinary form controls.
- The booking panel is not a full focus trap. It closes on Escape and takes focus on
  open, but focus can leave it while it is open.
- Tests run on Vitest, not Jest. The API is the same and RTL is unchanged, but the
  brief names Jest — worth confirming with the facilitator before submission.
- Nothing enforces booking rules beyond clashes: no maximum length, no limit per
  person, no approval step for large rooms.
