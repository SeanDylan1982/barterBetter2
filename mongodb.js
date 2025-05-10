const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb://localhost:27017/barterBetter";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let dbConnection;

module.exports = {
  connectToDb: async (callback) => {
    try {
      const client = await MongoClient.connect(uri);
      dbConnection = client.db('barterBetter');
      console.log('Successfully connected to MongoDB.');
      return callback();
    } catch (err) {
      console.error('Error connecting to MongoDB:', err);
      return callback(err);
    }
  },
  getDb: () => dbConnection
};
