const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!process.env.DB_PASSWORD) {
  console.error('DB_PASSWORD environment variable is not set!');
  console.error('Make sure you have a .env file in the root directory with DB_PASSWORD=your_password');
  process.exit(1);
}

const uri = `mongodb+srv://sean:${process.env.DB_PASSWORD}@cluster0.xxi4s51.mongodb.net/?retryWrites=true&w=majority`;

console.log('Attempting to connect to MongoDB...');

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 50,
  connectTimeoutMS: 10000, // Increased timeout
  retryWrites: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
});

let dbConnection;
let isConnected = false;

module.exports = {
  connectToDb: async (callback) => {
    try {
      if (isConnected) {
        console.log('Using existing database connection');
        return callback();
      }

      console.log('Connecting to MongoDB...');
      await client.connect();
      
      // Test the connection
      await client.db("admin").command({ ping: 1 });
      dbConnection = client.db('barterBetter');
      isConnected = true;
      console.log('Successfully connected to MongoDB.');
      
      // Handle application termination
      process.on('SIGINT', async () => {
        if (client) {
          await client.close();
          isConnected = false;
          console.log('MongoDB connection closed.');
        }
        process.exit(0);
      });

      // Handle unexpected errors
      process.on('uncaughtException', async (err) => {
        console.error('Uncaught Exception:', err);
        if (client) {
          await client.close();
          isConnected = false;
        }
        process.exit(1);
      });

      return callback();
    } catch (err) {
      console.error('Error connecting to MongoDB:', err);
      console.error('Connection URI:', uri.replace(process.env.DB_PASSWORD, '****'));
      if (err.name === 'MongoServerSelectionError') {
        console.error('Could not connect to MongoDB server. Please check:');
        console.error('1. Your internet connection');
        console.error('2. MongoDB Atlas status');
        console.error('3. Your IP whitelist in MongoDB Atlas');
      }
      return callback(err);
    }
  },
  getDb: () => {
    if (!dbConnection) {
      throw new Error('Database not initialized. Call connectToDb first.');
    }
    if (!isConnected) {
      throw new Error('Database connection lost. Please retry your operation.');
    }
    return dbConnection;
  }
};
