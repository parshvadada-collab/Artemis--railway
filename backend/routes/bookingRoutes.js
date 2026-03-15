'use strict';

const router = require('express').Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validateRequest');
const {
    createBooking, getBooking, updateBooking, cancelBooking,
    createBookingValidation, updateBookingValidation,
} = require('../controllers/bookingController');

router.post('/', createBookingValidation, validateRequest, createBooking);
router.get('/:pnr', getBooking);
router.put('/:pnr', authMiddleware, updateBookingValidation, validateRequest, updateBooking);
router.delete('/:pnr', authMiddleware, cancelBooking);

module.exports = router;
