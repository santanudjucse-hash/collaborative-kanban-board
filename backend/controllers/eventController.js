const eventService = require('../services/eventService');
const { v4: uuidv4 } = require('uuid');

/**
 * GET /api/events
 * Establishes real-time Server-Sent Events stream for collaborative updates.
 */
const subscribeEvents = (req, res) => {
  const clientId = req.query.clientId || uuidv4();
  eventService.addClient(clientId, res);
};

module.exports = {
  subscribeEvents,
};
