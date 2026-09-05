# CampusBook — backend

Node.js + Express REST API with JWT authentication and MongoDB (via Mongoose).

## Run it

```bash
cp ../.env.fullstack.example ../.env.fullstack   # then fill in the values
npm install
npm run seed               # populates the resource catalogue
npm run dev                # http://localhost:8080
npm test                   # Jest + Supertest
                           # API tests need MONGO_URL_TEST reachable;
                           # the realtime tests run without a database
```

## Configuration

Every credential for the whole stack lives in **`.env.fullstack` at the
repository root** — one file, not one per tier. It is git-ignored and
docker-ignored; `.env.fullstack.example` is the committed template.

`src/config/env.js` is the only place that reads it. Two things it guarantees:

- **A missing key fails immediately**, with a message naming the key and the
  file, instead of surfacing later as a confusing crash inside mongoose or
  jsonwebtoken.
- **Real environment variables win over the file.** Docker Compose and GitHub
  Actions inject their own values, and those must override whatever a developer
  happens to have locally.

| Key | Used for |
| --- | --- |
| `MONGO_URL` | The application database. |
| `MONGO_URL_TEST` | The test database. Must differ from `MONGO_URL` — the suite deletes every collection after each test, and `tests/db.js` refuses to run against a database whose name does not contain "test". |
| `JWT_SECRET` | Signing and verifying tokens. Use a different value for any deployment. |
| `PORT` | Port the API listens on (default 8080). |
| `NODE_ENV` | `development`, `test`, or `production`. |

With Docker, from the repository root: `docker compose up --build` starts Mongo,
the backend, and the frontend together.

## API

All routes are prefixed `/api`. Every route except `/auth/*` requires
`Authorization: Bearer <token>`.

| Method | Path | Auth | Body | Notes |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | – | `{ name, email, password }` | 201 `{ token, user }`. 409 if the email is taken. |
| POST | `/auth/login` | – | `{ email, password }` | 200 `{ token, user }`. 401 either way on a bad match — never reveals which half was wrong. |
| GET | `/resources` | required | – | 200, array of resources. |
| GET | `/bookings` | required | query: `day?` | 200, array of bookings. Omit `day` for every booking; pass `day=YYYY-MM-DD` to filter. |
| POST | `/bookings` | required | `{ resourceId, day, start, end, purpose }` | 201 `{ booking }`, or 409 `{ message, conflict }` if the window clashes. |
| DELETE | `/bookings/:id` | required | – | 200 `{ ok: true }`. 403 if you don't own it, 404 if it's already gone. |

`start`/`end` are `HH:MM` on the half-hour, `day` is `YYYY-MM-DD`. This matches
`frontend/src/lib/time.js` exactly, so both tiers agree on what a "slot" is
without either calling the other.

## Real-time (Socket.io)

Express and Socket.io share one HTTP server, so both are reachable on the same port
and the same nginx proxy rule covers them (the proxy already forwards the `Upgrade`
header a WebSocket needs).

`src/realtime.js` is the whole surface:

- **Authenticated.** The handshake carries the same JWT as the REST routes and is
  rejected without a valid one, so an anonymous socket cannot watch who is booking what.
- **Server-only broadcast.** Clients never emit booking events at each other. They call
  the REST API, and `bookingController` calls `announceBookingsChanged()` *after* the
  write succeeds — so a client cannot make other clients believe in a booking that was
  never saved.
- **`actorId` on every event**, letting a client ignore the echo of its own action.

`tests/realtime.test.js` covers this with real socket connections and needs no
database: a missing token is refused, a forged token is refused, and one broadcast
reaches every connected client.

## Concurrency

Two people can open a booking form for the same room at the same moment and both
submit. This is handled without a database transaction:

Every booking claims one `BookingSlot` document per half-hour it occupies,
`_id`-keyed as `` `${resourceId}::${day}::${start}` ``. A document's `_id` is
unique on any MongoDB instance — standalone or replica set, no special
configuration needed — so if two requests race for the same half-hour, the
second insert fails immediately with a duplicate-key error. `bookingController.
create` claims every slot a booking needs in one `insertMany` *before* the
booking document itself is written; on a clash it rolls back only the slots it
claimed itself, looks up whoever already holds the conflicting slot, and returns
409 with that booking attached — the first booking to land always wins, and
neither request can silently overwrite the other. Covered by the concurrent
request test in `tests/bookings.test.js`.

## Database design

- **Resource** uses its human-readable code as `_id` (`"LT-1"`), not a generated
  ObjectId — a booking can reference one with a plain string, and the API keeps
  matching the id the frontend already displays.
- **Booking** references `User` by ObjectId for ownership checks, but also
  stores `userName` denormalised. A booking is a historical fact: if someone
  renames their account later, past bookings should read as they were made, not
  silently relabel themselves.
- **BookingSlot** exists purely to make the unique-index trick above possible —
  it is not read anywhere else in the API.

## Known limitations

- No refresh tokens — a JWT is valid for 7 days and there's no revoke path.
- No rate limiting on `/auth/*`.
- Socket.io broadcasts to every connected client, with no per-resource rooms. Fine
  at this scale; it would need narrowing before it served a whole campus.
- The API tests have not yet been run against a live MongoDB — see the repository
  README for what remains unverified.
