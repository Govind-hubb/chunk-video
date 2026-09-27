import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/video_streaming_db';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ Worker: MongoDB Connected to ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ Worker: MongoDB connection error: ${error.message}`);
  }
}
