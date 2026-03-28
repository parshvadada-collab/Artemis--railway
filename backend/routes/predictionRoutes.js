const express = require('express');
const router = express.Router();
const { getPrediction } = require('../controllers/predictionController');
const { getPrebookingPrediction } = require('../controllers/prebookingPredictionController');

router.get('/prebooking', getPrebookingPrediction);
router.get('/:pnr', getPrediction);

module.exports = router;
