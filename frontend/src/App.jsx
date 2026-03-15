import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import BookTicket from './pages/BookTicket.jsx';
import CheckStatus from './pages/CheckStatus.jsx';
import Alternatives from './pages/Alternatives.jsx';

export default function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/book" element={<BookTicket />} />
                <Route path="/status" element={<CheckStatus />} />
                <Route path="/alternatives" element={<Alternatives />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
