import mongoose from 'mongoose';

// Wraps the Mongoose connection so server.js doesn't need to know
// how connecting works — just that connectDB() either succeeds or
// kills the process. Failing loudly here beats a server that "runs"
// but silently can't reach the database.
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;
