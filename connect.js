import mongodb from mongodb;

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://mongo:LL0921jj@cluster0.n9baelp.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
  const collection = client.db("users").collection("bbdb");
  // perform actions on the collection object
  
  // Insert code here to dynamically listen for input from users, store the input, parse the data received, query the db accordingly and return the result

  client.close();
});
