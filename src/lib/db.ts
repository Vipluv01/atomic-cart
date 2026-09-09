import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Next.js reloads route modules in dev; a module-scoped cache would be
// reset on every hot reload and reconnect on every request. Stashing the
// cache on `global` survives that reload.
const globalForMongoose = global as unknown as { mongooseCache?: MongooseCache };

const cache: MongooseCache = globalForMongoose.mongooseCache ?? { conn: null, promise: null };
globalForMongoose.mongooseCache = cache;

export async function connectToDatabase() {
  if (cache.conn) return cache.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
