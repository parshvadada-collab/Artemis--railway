'use strict';

const router = require('express').Router();
const { getAlternatives } = require('../controllers/alternativeController');

router.get('/', getAlternatives);

module.exports = router;
