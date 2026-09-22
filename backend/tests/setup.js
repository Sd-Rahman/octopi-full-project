import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Shared by every test file: spins up a real, throwaway, in-memory
// MongoDB REPLICA SET (via mongodb-memory-server) so tests run against
// actual Mongo behavior including multi-document transactions (which
// require a replica set). Needs process.env.JWT_SECRET set before
// app.js is imported by each test file.
let replSet;

export async function startTestDB() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
}

export async function stopTestDB() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

