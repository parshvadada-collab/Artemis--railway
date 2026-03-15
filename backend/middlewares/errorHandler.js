'use strict';

/**
 * Centralized error handler middleware.
 * Must be registered LAST in Express middleware chain (4 arguments).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    const status = err.status || err.statusCode || 500;
    const isDev = process.env.NODE_ENV === 'development';

    console.error(`[Error] ${req.method} ${req.path} → ${status}: ${err.message}`);
    if (isDev && err.stack) console.error(err.stack);

    res.status(status).json({
        error: err.message || 'Internal server error',
        ...(isDev && { stack: err.stack }),
    });
}

module.exports = { errorHandler };
