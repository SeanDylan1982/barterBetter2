const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!process.env.DB_PASSWORD) {
  console.error('DB_PASSWORD environment variable is not set!');
  console.error('Make sure you have a .env file in the root directory with DB_PASSWORD=your_password');
  process.exit(1);
}

// Log environment variable status (masking the actual password)
console.log('Environment check:', {
  envExists: !!process.env.DB_PASSWORD,
  envPath: path.join(__dirname, '.env'),
  workingDir: __dirname
});

const uri = `mongodb+srv://sean:${process.env.DB_PASSWORD}@cluster0.xxi4s51.mongodb.net/barterBetter?retryWrites=true&w=majority`;

const mongoOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 50,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  heartbeatFrequencyMS: 1000
};

console.log('Initializing MongoDB client...');
const client = new MongoClient(uri, mongoOptions);

let dbConnection;
let isConnected = false;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  connectToDb: async (callback) => {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        if (isConnected) {
          console.log('Using existing database connection');
          return callback();
        }

        console.log(`Connecting to MongoDB (attempt ${retryCount + 1}/${maxRetries})...`);
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
        console.error(`Error connecting to MongoDB (attempt ${retryCount + 1}/${maxRetries}):`, err);
        
        if (err.name === 'MongoServerSelectionError') {
          console.error('Could not connect to MongoDB server. Please check:');
          console.error('1. Your internet connection');
          console.error('2. MongoDB Atlas status');
          console.error('3. Your IP whitelist in MongoDB Atlas');
          console.error('4. Database credentials');
        }

        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`Retrying in 5 seconds...`);
          await sleep(5000);
        } else {
          console.error('Max retries reached. Could not connect to MongoDB.');
          return callback(err);
        }
      }
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
