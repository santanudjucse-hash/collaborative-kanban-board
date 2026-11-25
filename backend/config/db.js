const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kanban_board';
  
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected to database: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[MongoDB] Connection error: ${err.message}`);
    // If local mongo is not running and we are not in production, attempt to use mongodb-memory-server
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[MongoDB] Attempting fallback to MongoMemoryServer...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        const conn = await mongoose.connect(uri);
        isConnected = true;
        console.log(`[MongoDB] Fallback connected to in-memory MongoDB at ${uri}`);
        return;
      } catch (memErr) {
        console.error('[MongoDB] MongoMemoryServer fallback failed:', memErr.message);
      }
    }
    throw err;
  }
};

const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Disconnected from database');
  }
};

module.exports = { connectDB, disconnectDB };
