# CampusBook — Group 56

Room and equipment booking for campus. Students and staff can see which lecture
theatres, labs, study rooms and AV kit are free, and book a slot before someone
else does.

**Module: * * Full Stack Development (PUSL3120) · NSBM Green University · Year 3, Semester 1

| | |
| --- | --- |
| Frontend | React 18, Vite, React Router, Socket.io client |
| Backend | Node.js, Express, JWT, Socket.io |
| Database | MongoDB via Mongoose |
| Tests | Jest + React Testing Library (client), Jest + Supertest (server) |
| DevOps | Docker Compose, nginx, GitHub Actions |

---

## How to run

There are two ways to run this project. **Option A (Docker) is the one to use if
you just want it working** — it starts the frontend, the backend and the database
together with one command. Option B runs each tier by hand, which is what you
want while developing.

### What you need first

| Tool | Version | Check with |
| --- | --- | --- |
| Docker Desktop | 4.x or newer | `docker --version` |
| Node.js | 22 or newer | `node --version` |
| Git | any recent | `git --version` |

For Option A you only need Docker and Git. Node is needed for Option B.

> **Windows note:** Docker Desktop must actually be *running*, not just
> installed. If you see `failed to connect to the docker API ... pipe/dockerDesktopLinuxEngine`,
> open Docker Desktop and wait for the whale icon to stop animating, then retry.

---

## Option A — Run everything with Docker (recommended)

### Step 1. Clone the repository

```bash
git clone https://github.com/ShakyaPrabashana/Fullstack-project-Group-number-56-.git
cd Fullstack-project-Group-number-56-
```

### Step 2. Create the environment file

Every credential for the whole stack lives in one file at the repository root
called `.env.fullstack`. It is **not** in git, so you have to create it from the
template:

```bash
cp .env.fullstack.example .env.fullstack
```

On Windows PowerShell:

```powershell
Copy-Item .env.fullstack.example .env.fullstack
```

Now open `.env.fullstack` and set `JWT_SECRET` to any long random string. You can
generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Leave `MONGO_URL` as it is — Docker Compose overrides it with the address of the
database container. The file should look like this:

```ini
MONGO_URL=mongodb://localhost:27017/campusbook
MONGO_URL_TEST=mongodb://localhost:27017/campusbook_test
JWT_SECRET=paste-your-generated-secret-here
PORT=8080
NODE_ENV=development
```

### Step 3. Start the stack

```bash
docker compose up --build
```

The first run takes a few minutes because it downloads MongoDB and builds both
images. You will know it is ready when the logs show:

```
campusbook-mongo    | Waiting for connections
campusbook-backend  | MongoDB connected: campusbook
campusbook-backend  | CampusBook API listening on :8080 (REST + WebSocket)
```

To run it in the background instead, add `-d`:

```bash
docker compose up --build -d
```

### Step 4. Load the resource catalogue

The database starts empty. In a **second terminal**, seed the 14 bookable
resources:

```bash
docker compose exec backend node src/seed/seed.js
```

Expected output:

```
Seeded 14 resources into campusbook.
```

Without this step the board loads but has no rows.

### Step 5. Open the application

| What | Address |
| --- | --- |
| The application | http://localhost:5180 |
| API health check | http://localhost:8080/health |

### Step 6. Create an account

There is **no demo login**. Accounts are real: the password is hashed with bcrypt
on the server before it is stored.

1. Click **Register** under the sign-in form
2. Enter any name, an email, and a password of **at least 8 characters**
3. You land straight on the booking board

### Step 7. Make a booking

1. Click any empty cell on the board — the grey hatched blocks are already taken
2. Choose a duration and type what the booking is for
3. Press **Confirm booking**

Your booking appears in solid green. Other people's appear hatched in grey with
their name on them.

### Step 8. Stop it

```bash
docker compose down
```

That stops and removes the containers but **keeps the database**. To delete the
data as well:

```bash
docker compose down -v
```

---

## Option B — Run each tier separately (for development)

Use this when you want hot reload while editing code.

### Step 1. Start MongoDB only

```bash
docker compose up -d mongo
```

If you have MongoDB installed natively instead, just make sure it is running on
port 27017.

### Step 2. Start the backend

```bash
cd backend
npm install
npm run seed     # only needed once
npm run dev      # http://localhost:8080
```

### Step 3. Start the frontend

In a **second terminal**:

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Open **http://localhost:5173**. Vite proxies `/api` and `/socket.io` to port
8080, so the frontend reaches the backend with no CORS setup.

> If the backend is not running, the board shows a *"Cannot reach the server"*
> notice instead of hanging on a spinner. That message means the API is down, not
> that the frontend is broken.

---

## Seeing the real-time updates

This is the part worth demonstrating. Two people booking at the same time see
each other's changes immediately.

1. Open **http://localhost:5180** in a normal browser window and register as one person
2. Open the same address in an **incognito/private window** and register as a second person
3. Book a slot in one window

It appears in the other window within a moment, with a short pulse — no refresh.

> Use an incognito window for the second user, not a second normal tab. Normal
> tabs share the same browser storage, so you would be signed in as the same
> person twice.

Try booking a slot that the other person already took: the booking panel turns
red and names who holds it, instead of silently overwriting them.

---

## Running the tests

```bash
cd frontend
npm test          # 28 tests — Jest + React Testing Library

cd ../backend
npm test          # 19 tests — Jest + Supertest
```

The backend tests need MongoDB running and use a **separate** database
(`MONGO_URL_TEST`). The suite deletes every collection between tests and refuses
to start if the database name does not contain "test", so it cannot wipe your
real bookings by accident.

---

## Architecture

```
  Browser
     |
     |  HTTP  /api/*        REST: auth, resources, bookings
     |  WS    /socket.io/*  live board updates
     v
  +----------------------------+
  |  frontend   nginx :80      |  React build served as static files.
  |             (:5180 on host)|  Proxies /api and /socket.io to the backend.
  +-------------+--------------+
                |
                v
  +----------------------------+
  |  backend    Express :8080  |  REST API and Socket.io on one HTTP server.
  |  routes -> controllers     |  JWT required on everything except /api/auth/*.
  |         -> models          |
  +-------------+--------------+
                |  Mongoose
                v
  +----------------------------+
  |  mongo      MongoDB :27017 |  users, resources, bookings, bookingslots
  +----------------------------+
```

```
Fullstack-project-Group-number-56-/
├── frontend/          React app, nginx image
├── backend/           Express API, Socket.io, Mongoose models
├── docs/              Assignment report
├── .github/workflows/ CI/CD pipeline
├── docker-compose.yml frontend + backend + mongo
└── .env.fullstack     credentials (NOT in git — create it yourself)
```

Detailed notes live in [`frontend/README.md`](frontend/README.md) and
[`backend/README.md`](backend/README.md).

---

## API

Every route is prefixed `/api`. Everything except the auth routes needs an
`Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | – | Create an account, returns a JWT |
| POST | `/api/auth/login` | – | Sign in, returns a JWT |
| GET | `/api/resources` | Yes | The bookable catalogue |
| GET | `/api/bookings` | Yes | All bookings, or one day with `?day=YYYY-MM-DD` |
| POST | `/api/bookings` | Yes | Create a booking, `409` if the window clashes |
| DELETE | `/api/bookings/:id` | Yes | Cancel your own booking |

---

## Troubleshooting

| Problem | Cause and fix |
| --- | --- |
| `failed to connect to the docker API` | Docker Desktop is not running. Start it and wait for it to finish loading. |
| `port is already allocated` | Something else uses 5180. Run `FRONTEND_PORT=4000 docker compose up` and open port 4000 instead. |
| Board loads but has no rows | You skipped the seed step. Run `docker compose exec backend node src/seed/seed.js`. |
| "Cannot reach the server" | The backend is down. Check `docker compose ps` and `docker compose logs backend`. |
| `Missing required environment variable: JWT_SECRET` | `.env.fullstack` is missing or has no secret. See Option A, step 2. |
| Both windows sign in as the same user | Use an incognito window for the second user — normal tabs share storage. |
| Real-time not updating | Check the browser console for a socket error, and that the backend logs show `REST + WebSocket`. |

---

## Known limitations

- **Not deployed to a public URL yet.** It runs locally with Docker Compose, and
  CI builds the image, but the deploy step still needs a host configured.
- A JWT lasts 7 days with no refresh or revoke path.
- The token is kept in `localStorage`, which any script on the page can read. An
  httpOnly cookie would be stronger.
- No rate limiting on the login endpoint.
- No booking policies beyond clash detection — no maximum length, no limit per
  person, no approval step for large rooms.
- Board cells are pointer shortcuts and are skipped by Tab. The keyboard path is
  the resource button on each row, which opens the same panel with ordinary form
  controls.

---

## Team — Group 56

| No. | Student Name | Student ID | Area |
| --- | --- | --- | --- |
| 01 | B.D.S Prabhashana | 34112 | Frontend / core structure |
| 02 | C.T Weckasinghe | 33833 | Frontend / design |
| 03 | L.V Randeniya | 33568 | Frontend / integration |
| 04 | R.D.A.A Ranathunga | 33512 | Testing / Docker |
| 05 | O.R.V Methdini | 34334 | Testing / CD pipeline |
| 06 | A.Y.S Balasooriya | 30795 | Testing / CI pipeline |
| 07 | H.W.S Kalhari | 36438 | Backend |
| 08 | N.B.C.N Weerathunga | 36442 | Backend |
| 09 | R.M.L Wijesundara | 30899 | Backend |
| 10 | H.C.S Thilakarathne | 30894 | Backend |

**Branches:** work happens on `dev_frontend` and `dev_backend`, merged into
`main` through pull requests.
