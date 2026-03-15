import axios from 'axios';

const BASE = '/api';

// ── Auth token management ────────────────────────────────────────────────────
let _token = localStorage.getItem('railwise_token') || null;

export function setToken(t) {
    _token = t;
    if (t) localStorage.setItem('railwise_token', t);
    else localStorage.removeItem('railwise_token');
}

export function getToken() { return _token; }

function authHeaders() {
    return _token ? { Authorization: `Bearer ${_token}` } : {};
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function login(username, password) {
    const res = await axios.post(`${BASE}/auth/login`, { username, password });
    setToken(res.data.token);
    return res.data;
}

// ── Trains ────────────────────────────────────────────────────────────────────
export async function searchTrains({ source, destination }) {
    // Uses the alternatives endpoint for a "same date" direct search
    const res = await axios.get(`${BASE}/alternatives`, {
        params: {
            source,
            destination,
            date: new Date().toISOString().split('T')[0],
            preference: 'fastest',
        },
    });
    return res.data.alternatives || [];
}

// ── Bookings ──────────────────────────────────────────────────────────────────
export async function createBooking(payload) {
    const res = await axios.post(`${BASE}/bookings`, payload, {
        headers: authHeaders(),
    });
    return res.data;
}

export async function getBookingByPNR(pnr) {
    const res = await axios.get(`${BASE}/bookings/${pnr.toUpperCase()}`);
    return res.data;
}

export async function updateBooking(pnr, payload) {
    const res = await axios.put(`${BASE}/bookings/${pnr.toUpperCase()}`, payload, {
        headers: authHeaders(),
    });
    return res.data;
}

export async function cancelBooking(pnr) {
    const res = await axios.delete(`${BASE}/bookings/${pnr.toUpperCase()}`, {
        headers: authHeaders(),
    });
    return res.data;
}

// ── Predictions ───────────────────────────────────────────────────────────────
export async function getPredictionByPNR(pnr) {
    const res = await axios.get(`${BASE}/predictions/${pnr.toUpperCase()}`);
    return res.data;
}

// ── Alternatives ──────────────────────────────────────────────────────────────
export async function getAlternatives({ source, destination, date, preference }) {
    const res = await axios.get(`${BASE}/alternatives`, {
        params: { source, destination, date, preference },
    });
    return res.data;
}

// ── Allocations ───────────────────────────────────────────────────────────────
export async function triggerReallocation(trainId) {
    const res = await axios.post(`${BASE}/allocations/reallocate?trainId=${trainId}`, {}, {
        headers: authHeaders(),
    });
    return res.data;
}
