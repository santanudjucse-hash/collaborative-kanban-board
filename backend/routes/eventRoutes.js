const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

// GET /api/events
router.get('/events', eventController.subscribeEvents);

module.exports = router;
