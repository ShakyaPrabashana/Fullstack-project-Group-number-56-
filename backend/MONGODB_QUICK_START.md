# MongoDB Quick Start for CampusBook Backend

## ⚡ 30-Second Setup

### 1. Copy Environment Template
```bash
cp .env.fullstack.example .env.fullstack
```

### 2. Choose Your Setup

#### Option A: Local MongoDB (Easiest for Development)
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Linux
sudo apt-get install mongodb
sudo systemctl start mongod

# Windows (or download from mongodb.com)
```

Then in `.env.fullstack`:
```env
MONGO_URL=mongodb://localhost:27017/campusbook
MONGO_URL_TEST=mongodb://localhost:27017/campusbook_test
JWT_SECRET=dev-secret-12345
PORT=8080
NODE_ENV=development
```

#### Option B: Docker (Recommended)
```bash
docker-compose up -d
```

Then in `.env.fullstack`:
```env
MONGO_URL=mongodb://mongo:27017/campusbook
MONGO_URL_TEST=mongodb://mongo:27017/campusbook_test
JWT_SECRET=dev-secret-12345
PORT=8080
NODE_ENV=development
```

#### Option C: MongoDB Atlas (Cloud)
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string

Then in `.env.fullstack`:
```env
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/campusbook
MONGO_URL_TEST=mongodb+srv://user:password@cluster.mongodb.net/campusbook_test
JWT_SECRET=dev-secret-12345
PORT=8080
NODE_ENV=development
```

### 3. Install & Run
```bash
cd backend
npm install
npm run dev
```

✅ Server running at `http://localhost:8080`

---

## Database Structure

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| **Users** | Registered campus members | email, passwordHash, name |
| **Resources** | Rooms & equipment to book | _id (e.g., "LT-1"), kind, capacity |
| **Bookings** | User reservations | resourceId, day, start, end, userId |
| **BookingSlots** | Concurrency guard | _id (prevents double-booking) |

---

## Common Commands

```bash
# Seed sample data
npm run seed

# Run tests
npm test

# Check connection
node -e "const mongoose = require('mongoose'); require('dotenv').config({ path: '../.env.fullstack' }); mongoose.connect(process.env.MONGO_URL).then(() => console.log('✅ Connected')).catch(e => console.error('❌', e.message))"
```

---

## Verify Setup

You should see:
```
CampusBook API listening on :8080 (REST + WebSocket)
```

Try the API:
```bash
curl http://localhost:8080/api/health
```

---

## Need Help?

See `DATABASE_SETUP.md` for detailed setup, troubleshooting, and architecture notes.
