# 🚂 RailWise — Intelligent Railway Booking System

> **AI-powered railway ticket management with real-time waitlist prediction, dynamic seat allocation, and smart route alternatives.**

Built for the **Datathon 2026** hackathon by Team **Artemis**.

---

## ✨ Features

| Module | Description |
|---|---|
| 🎫 **Booking Portal** | Search trains, select class, book tickets — confirmed or waitlisted |
| 🧠 **Waitlist Prediction** | ML model predicts % probability of waitlist confirmation by PNR |
| 🔄 **Dynamic Seat Allocation** | Auto-reallocates seats on cancellation using transaction-safe logic |
| 🗺️ **Smart Route Alternatives** | Multi-leg routing when direct trains are unavailable |
| 📊 **Operator Dashboard** | Real-time stats, booking distribution charts, seat utilization |

---

## 🖥️ Live Demo

🔗 **[https://artemis-railway.vercel.app ](https://artemis-railway.vercel.app/)**

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite**
- **React Router v6** — client-side routing with CSS page transitions
- **Recharts** — booking distribution & utilization charts
- **Pure CSS animations** — moving train parallax, flying birds, gold cursor follower
- **Glassmorphism UI** — dark luxury theme (`#0A0A0A` + `#D4AF37` gold)

### Backend
- **Node.js** + **Express**
- **MySQL2** — relational database with connection pooling
- **Helmet** + **CORS** + **Rate Limiting** — production-grade security
- **node-cron** — scheduled seat reallocation every 15 minutes

### ML / Prediction
- Rule-based + feature-weighted model for waitlist confirmation probability
- Features: waitlist position, class, route demand, day-of-week, season

### Deployment
- **Railway.app** — unified backend + frontend in one service
- **GitHub Actions** — auto-deploy on push to `main`

---

## 📁 Project Structure

```
railway-ticket-management/
├── backend/
│   ├── app.js                  # Express app (serves API + frontend dist)
│   ├── server.js               # Entry point, PORT binding
│   ├── routes/
│   │   ├── bookingRoutes.js
│   │   ├── trainRoutes.js
│   │   ├── predictionRoutes.js
│   │   ├── alternativeRoutes.js
│   │   ├── allocationRoutes.js
│   │   └── adminRoutes.js
│   ├── controllers/
│   ├── middlewares/
│   └── utils/
│       ├── db.js               # MySQL connection pool
│       └── scheduler.js        # Cron job for seat reallocation
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx      # Hero with moving train + birds
│   │   │   ├── BookTicket.jsx       # Train search + booking flow
│   │   │   ├── CheckStatus.jsx      # PNR waitlist prediction
│   │   │   ├── Alternatives.jsx     # Smart multi-leg routing
│   │   │   └── AdminDashboard.jsx   # Operator stats & charts
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── CursorFollower.jsx   # Gold cursor dot + ring
│   │   │   └── PageTransition.jsx
│   │   ├── App.jsx                  # Routes + CSS page transitions
│   │   └── index.css                # Global design system
│   └── public/
│       └── train-asset-1.jpeg       # Hero background image
├── railway.json                # Railway deployment config
├── Procfile                    # Fallback process definition
└── README.md
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- MySQL 8+

### 1. Clone the repo
```bash
git clone https://github.com/parshvadada-collab/Artemis--railway.git
cd Artemis--railway
```

### 2. Set up environment variables
Create a `.env` file in the root:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=railway_db
JWT_SECRET=your_jwt_secret
PORT=5000
```

### 3. Set up the database
```bash
mysql -u root -p < scripts/populateDB.js
# or run the migration manually
node backend/scripts/migration.js
```

### 4. Start backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
```

### 5. Start frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 🌐 Deployment on Railway

### One-service deployment (Frontend + Backend together)

The `railway.json` configures Railway to:
1. Build the React frontend (`npm run build`)
2. Install backend dependencies
3. Serve everything from one Express server

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd frontend && npm install && VITE_API_URL='' npm run build && cd ../backend && npm install"
  },
  "deploy": {
    "startCommand": "cd backend && node server.js"
  }
}
```

### Required Environment Variables (Railway → Variables tab)

| Variable | Value |
|---|---|
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `JWT_SECRET` | `your-secure-secret` |

> Add a **MySQL** service in Railway → it auto-injects the `MYSQL*` variables.

---

## 📡 API Endpoints

### Trains
```
GET  /api/trains/search?source=Mumbai&destination=Delhi&date=2026-03-20
```

### Bookings
```
POST /api/bookings
Body: { name, age, contact, train_id, seat_class }

GET  /api/bookings/:pnr
```

### Waitlist Prediction
```
GET  /api/predictions/:pnr
Response: { confirmation_probability, status, confidence, label }
```

### Smart Alternatives
```
GET  /api/alternatives?source=Mumbai&destination=Delhi&date=2026-03-20&preference=fastest
```

### Admin
```
GET  /api/admin/stats
GET  /api/admin/routes
GET  /api/admin/trains
GET  /api/admin/recent
GET  /api/admin/waitlist
```

### Seat Allocation
```
POST /api/allocations/reallocate
POST /api/allocations/cancel/:bookingId
```

---

## 🎨 UI Highlights

- **Moving train parallax** — hero background pans horizontally (40s CSS animation)
- **Flying gold birds** — 6 SVG birds at varying speeds & depths over the hero
- **Custom gold cursor** — snappy dot + lagging ring with hover expand (`requestAnimationFrame` lerp)
- **Page transitions** — CSS keyframe animations (slide-up, zoom, blur) on every route change
- **Glassmorphism cards** — `rgba(255,255,255,0.04)` + `backdrop-filter: blur`
- **Circular probability indicator** — animated SVG ring for PNR waitlist status

---

## 👥 Team Artemis

Built with ❤️ for **Datathon 2026**

---

## 📄 License

MIT — free to use, modify, and distribute.
