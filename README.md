# RailWise - Intelligent Railway Booking System

AI-powered railway ticket management with real-time waitlist prediction, dynamic seat allocation, and smart route alternatives.

Built for the Datathon 2026 hackathon by Team Artemis.

## Features

- Booking portal for train search and ticket booking
- Waitlist prediction by PNR using a separate ML service
- Dynamic seat reallocation when cancellations happen
- Smart route alternatives including multi-leg journeys
- Operator dashboard with booking and utilization stats

## Tech Stack

### Frontend

- React 18 + Vite
- React Router
- Recharts

### Backend

- Node.js + Express
- PostgreSQL runtime database
- `pg` with a MySQL-style compatibility adapter in `backend/utils/db.js`
- Helmet, CORS, rate limiting, cron-based reallocation

### ML

- Python prediction service
- Pretrained waitlist confirmation model in `ml/models/waitlistPredictor.pkl`

## Important Database Note

The current runtime app uses PostgreSQL, not MySQL.

- The backend database layer is implemented in `backend/utils/db.js` using `pg`
- Some older scripts and dependencies still reference MySQL from an earlier iteration of the project
- For local setup and judging, treat PostgreSQL as the source of truth for the running app

## Project Structure

```text
backend/    Express API and database layer
frontend/   React client
ml/         Python prediction service and trained model
scripts/    Database bootstrap and seed helpers
```

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Python 3.10+ for the ML service

### 1. Clone the repo

```bash
git clone https://github.com/parshvadada-collab/Artemis--railway.git
cd Artemis--railway
```

### 2. Create `.env`

Use the root `.env.example` as the template.

Example:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/railway_db
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=railway_db
JWT_SECRET=your_jwt_secret
PORT=5000
ML_SERVICE_URL=http://localhost:5002
```

### 3. Create and seed the database

```bash
createdb railway_db
node scripts/populateDB.js
```

Note:

- `scripts/populateDB.js` is the PostgreSQL-oriented bootstrap script used by the current app flow
- Some older migration and seed scripts in the repo are MySQL-era leftovers and are not the primary local setup path

### 4. Start the backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on the Vite dev server.

### 6. Start the ML service

```bash
cd ml
pip install -r requirements.txt
python predict_server.py
```

ML service runs on `http://localhost:5002`.

## Core API Endpoints

### Trains

```text
GET /api/trains/search?source=Mumbai&destination=Delhi&date=2026-03-20
```

### Bookings

```text
POST /api/bookings
GET /api/bookings/:pnr
```

### Predictions

```text
GET /api/predictions/:pnr
```

### Alternatives

```text
GET /api/alternatives?source=Mumbai&destination=Delhi&date=2026-03-20&preference=fastest
```

### Admin

```text
GET /api/admin/stats
GET /api/admin/routes
GET /api/admin/trains
GET /api/admin/recent
GET /api/admin/waitlist
```

## Deployment Notes

If deploying on Railway, provision PostgreSQL for the runtime database and set:

- `DATABASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `ML_SERVICE_URL`
- `NODE_ENV`
- `PORT`

## License

MIT
