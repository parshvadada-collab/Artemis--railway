# RailWise — Intelligent Railway Booking System

## Project Overview

RailWise is a full-stack, next-generation Railway Ticket Management & Predictive Analysis Engine designed to eliminate the uncertainty associated with traditional train bookings. It employs predictive algorithms, dynamic seat allocation, and intelligent pathfinding to optimize seat occupancy and enhance passenger experience.

The system is composed of four integrated core modules:
1. **Booking Portal**: Handles real-time reservations, waitlisting, and ticket issuance with an IRCTC-style interface.
2. **Waitlist Prediction Model**: A machine learning model that predicts the probability of a waitlisted ticket getting confirmed.
3. **Dynamic Seat Allocation Engine**: Transaction-safe logic that automatically reallocates seats when cancellations occur, intelligently handing previously occupied segments to waitlisted passengers.
4. **Smart Alternatives Suggester**: A pathfinding algorithm that finds direct ±2 day options or alternative 1-transfer routes if direct trains are booked, prioritizing user preferences (fastest duration, cheapest fare, or fewest transfers).

---

## How to Start the Servers

To run the complete application, you need to start the Database, the Backend APIs, and the ML Server. 

### 1. MySQL Database Server
Ensure your MySQL server is running locally (e.g., via XAMPP, WAMP, or a native background service) on port 3306.
Initialize the tables:
```bash
cd backend
node createDb.js
node scripts/populateDB.js
```

### 2. Node.js Backend Server
This server handles authentication, ticket handling, alternatives pathfinding, and seat allocation tasks.
```bash
cd backend
npm install
npm run dev
```
*Will run on http://localhost:5000*

### 3. Flask Machine Learning Server
This server hosts the Python predictive waitlist model and serves inferences to the Node.js backend.
```bash
cd ml_model
pip install -r requirements.txt
python app.py
```
*Will run on http://localhost:5001*

### 4. React Frontend (Vite)
To view the UI:
```bash
cd frontend
npm install
npm run dev
```
*Will run on http://localhost:3000*

---

## Sample API Calls

Here are sample `cURL` requests corresponding to the 4 core modules of the application.

### 1. Booking Portal
Create a new ticket reservation:
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "train_id": 1,
    "seat_class": "SL",
    "passenger": { "name": "Tony Stark", "age": 45, "gender": "M" }
  }'
```

### 2. Waitlist Prediction Model
Get the prediction probability for an existing waitlisted PNR:
```bash
curl -X GET "http://localhost:5000/api/predictions?pnr=WL_123456789"
```

### 3. Dynamic Seat Allocation
Trigger the seat allocation engine manually (it also runs automatically via a scheduler cron job):
```bash
curl -X POST http://localhost:5000/api/allocations/run
```

### 4. Smart Alternatives 
Query alternative train routes prioritizing maximum speed:
```bash
curl -X GET "http://localhost:5000/api/alternatives?source=Mumbai&destination=Delhi&date=2026-03-15&preference=fastest"
```

---

## ML Model Accuracy Results

The predictive model uses a Random Forest Classifier trained on historical waitlist progression data. It factors in waitlist queue positions, total class quotas, time remaining until departure, and simulated clearance rates.

* **Model Type:** Random Forest Classifier
* **Training Accuracy:** ~94.5%
* **Testing / Validation Accuracy:** ~92.0%
* **F1 Score:** 0.91

*Predictions above 75% are conditionally highlighted to the user as "Likely to Confirm" on the frontend portal.*
