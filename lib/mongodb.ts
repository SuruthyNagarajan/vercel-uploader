import { MongoClient } from 'mongodb';

// Extend the global object to include _mongoClientPromise for development
declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error('Please add your Mongo URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so the connection
  // is cached across module reloads.
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, just create a new client and promise.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a promise to resolve to a MongoClient object
export default clientPromise;