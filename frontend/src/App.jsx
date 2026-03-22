import React, { useRef, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import CursorFollower from './components/CursorFollower.jsx';
import LandingPage from './pages/LandingPage.jsx';
import BookTicket from './pages/BookTicket.jsx';
import CheckStatus from './pages/CheckStatus.jsx';
import Alternatives from './pages/Alternatives.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Login from './pages/Login.jsx';

const AppLayout = () => {
    const location = useLocation();
    const prevPathRef = useRef(null);
    const [animClass, setAnimClass] = useState('');

    useEffect(() => {
        const prev = prevPathRef.current;
        const curr = location.pathname;

        // Determine which animation to play
        let cls = 'route-enter'; // default page → page
        if (curr === '/') {
            cls = 'route-enter-landing'; // anything → landing
        } else if (prev === '/' || prev === null) {
            cls = 'route-enter-from-landing'; // landing → page (or first load)
        }

        // Reset the class first (force reflow so animation re-triggers)
        setAnimClass('');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setAnimClass(cls);
            });
        });

        // Store current as previous for next navigation
        prevPathRef.current = curr;
    }, [location.pathname]);

    const isLanding = location.pathname === '/' || location.pathname === '/login';

    return (
        <>
            <CursorFollower />
            {!isLanding && <Navbar />}
            <div className={animClass} key={location.pathname}>
                <Routes location={location}>
                    <Route path="/"             element={<LandingPage />} />
                    <Route path="/login"        element={<Login />} />
                    <Route path="/book"         element={<BookTicket />} />
                    <Route path="/status"       element={<CheckStatus />} />
                    <Route path="/alternatives" element={<Alternatives />} />
                    <Route path="/admin"        element={<AdminDashboard />} />
                    <Route path="*"             element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </>
    );
};

export default function App() {
    return (
        <BrowserRouter>
            <AppLayout />
        </BrowserRouter>
    );
}
