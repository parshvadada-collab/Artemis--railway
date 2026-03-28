'use strict';

const router = require('express').Router();
const { chatWithAssistant } = require('../controllers/chatController');

router.post('/', chatWithAssistant);

module.exports = router;
