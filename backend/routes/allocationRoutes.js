const express = require('express');
const router = express.Router();
const { reallocateSeats } = require('../controllers/allocationController');

router.post('/reallocate', reallocateSeats);

module.exports = router;
