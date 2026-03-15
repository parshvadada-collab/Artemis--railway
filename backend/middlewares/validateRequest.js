'use strict';

const { validationResult } = require('express-validator');

/**
 * Middleware: checks express-validator results and returns 422 on failure.
 */
function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            error: 'Validation failed',
            details: errors.array().map(e => ({ field: e.path, message: e.msg })),
        });
    }
    next();
}

module.exports = { validateRequest };
