import axios from 'axios';

const BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

// ── IST timezone utility ─────────────────────────────────────────────────────
const getTodayIST = () => {
    const nowUTC = new Date();
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(nowUTC.getTime() + IST_OFFSET_MS);
    const y = nowIST.getUTCFullYear();
    const m = String(nowIST.getUTCMonth() + 1).padStart(2, '0');
    const d = String(nowIST.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

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
// ✅ FIXED: now calls /trains/search, not /alternatives
// ✅ FIXED: date uses IST, not raw new Date() which could be wrong timezone
export async function searchTrains({ source, destination, date }) {
    const searchDate = date || getTodayIST();
    const res = await axios.get(`${BASE}/trains/search`, {
        params: { source, destination, date: searchDate },
    });
    return res.data.trains || res.data || [];
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
    const searchDate = date || getTodayIST();
    const res = await axios.get(`${BASE}/alternatives`, {
        params: { source, destination, date: searchDate, preference },
    });
    return res.data;
}

// ── Allocations ───────────────────────────────────────────────────────────────
export async function triggerReallocation(trainId) {
    const res = await axios.post(
        `${BASE}/allocations/reallocate?trainId=${trainId}`,
        {},
        { headers: authHeaders() }
    );
    return res.data;
}
