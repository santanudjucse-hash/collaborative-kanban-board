/**
 * Server-Sent Events (SSE) Manager
 * Handles client subscriptions, heartbeat pings, and broadcasting events.
 */
class EventService {
  constructor() {
    this.clients = new Map();
    this.heartbeatInterval = null;
    this.startHeartbeat();
  }

  /**
   * Register a new SSE client
   * @param {string} clientId 
   * @param {import('express').Response} res 
   */
  addClient(clientId, res) {
    // Set required headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx, Render)
    res.flushHeaders?.();

    this.clients.set(clientId, res);
    console.log(`[SSE] Client connected: ${clientId}. Total active clients: ${this.clients.size}`);

    // Send initial handshake / welcome event
    this.sendToClient(clientId, 'CONNECTED', {
      clientId,
      timestamp: new Date().toISOString(),
      activeClients: this.clients.size,
    });

    // Handle client disconnect
    res.on('close', () => {
      this.removeClient(clientId);
    });

    res.on('error', (err) => {
      console.error(`[SSE] Error on client ${clientId}:`, err.message);
      this.removeClient(clientId);
    });
  }

  /**
   * Remove a disconnected SSE client
   * @param {string} clientId 
   */
  removeClient(clientId) {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      console.log(`[SSE] Client disconnected: ${clientId}. Remaining clients: ${this.clients.size}`);
    }
  }

  /**
   * Send an event to a single client
   */
  sendToClient(clientId, eventType, data) {
    const res = this.clients.get(clientId);
    if (!res || res.writableEnded) return;

    try {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error(`[SSE] Failed writing to client ${clientId}:`, err.message);
      this.removeClient(clientId);
    }
  }

  /**
   * Broadcast an event to all connected clients
   * @param {string} eventType e.g., 'TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED'
   * @param {object} data Payload object
   * @param {string} [excludeClientId] Optional client ID to exclude from broadcast
   */
  broadcast(eventType, data, excludeClientId = null) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    
    let deliveredCount = 0;
    for (const [clientId, res] of this.clients.entries()) {
      if (excludeClientId && clientId === excludeClientId) {
        continue;
      }

      if (res.writableEnded) {
        this.removeClient(clientId);
        continue;
      }

      try {
        res.write(payload);
        deliveredCount++;
      } catch (err) {
        console.error(`[SSE] Broadcast error to ${clientId}:`, err.message);
        this.removeClient(clientId);
      }
    }

    console.log(`[SSE] Broadcasted ${eventType} to ${deliveredCount} client(s).`);
  }

  /**
   * Start 15s heartbeat pings to keep connections alive through proxies and firewalls
   */
  startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.clients.size === 0) return;

      const pingPayload = `: ping ${new Date().toISOString()}\n\n`;
      for (const [clientId, res] of this.clients.entries()) {
        if (res.writableEnded) {
          this.removeClient(clientId);
          continue;
        }
        try {
          res.write(pingPayload);
        } catch {
          this.removeClient(clientId);
        }
      }
    }, 15000);
  }

  /**
   * Cleanup for tests and server shutdown
   */
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const [clientId, res] of this.clients.entries()) {
      try {
        res.end();
      } catch {}
    }
    this.clients.clear();
  }

  getClientCount() {
    return this.clients.size;
  }
}

// Export singleton instance
const eventService = new EventService();
module.exports = eventService;
