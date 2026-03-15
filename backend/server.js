'use strict';

require('dotenv').config();

const app = require('./app');
const { startScheduler } = require('./utils/scheduler');

const PORT = parseInt(process.env.PORT || '5000', 10);

const server = app.listen(PORT, () => {
    console.log(`[Server] Railway Ticket API running on http://localhost:${PORT}`);
    startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received — draining connections...');
    server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
    });
});

process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled rejection:', reason);
});
