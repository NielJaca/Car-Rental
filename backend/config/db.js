const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MongoDB connection error: MONGODB_URI is not set in .env');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('');
      console.error('Troubleshooting:');
      console.error('  1. MongoDB Atlas: Log in at https://cloud.mongodb.com and check:');
      console.error('     - Cluster is not paused (free tier pauses after inactivity). Click "Resume".');
      console.error('     - Network Access: Add your IP or 0.0.0.0/0 (Allow from anywhere).');
      console.error('  2. Connection string: In Atlas → Connect → Drivers, copy the URI and replace <password> with your DB user password.');
      console.error('  3. If DNS is blocked: Try the "Connection string" with mongodb:// (not mongodb+srv://) and the host list from Atlas.');
      console.error('');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
